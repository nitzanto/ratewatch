import { maxRequestsPerUpdate } from '../constants/dashboard.constants';
import type { Activity } from '../interfaces/activity.interface';
import type { Decision } from '../interfaces/decision.interface';
import {
  addDecision,
  buildHistoryField,
  buildLimitExceededEvent,
  buildUpdateEvent,
  mergeActivities,
  mergeCounts,
} from './activity.helpers';

const minute = Date.parse('2026-11-01T12:00:00.000Z') / 60_000;

const decision = (overrides: Partial<Decision> = {}): Decision => ({
  userId: 'user-42',
  allowed: true,
  at: minute * 60_000 + 1_000,
  limit: 100,
  used: 59,
  resetAt: minute * 60_000 + 30 * 60_000,
  firstRefusal: false,
  ...overrides,
});

describe('buildHistoryField', () => {
  it('names the minute an accepted or a refused request counts in', () => {
    expect(buildHistoryField(decision())).toBe(`a:${minute}`);
    expect(buildHistoryField(decision({ allowed: false }))).toBe(`r:${minute}`);
  });
});

describe('mergeCounts', () => {
  it('adds the counts up field by field, and leaves both inputs as they were', () => {
    const a = new Map([['a:1', 2]]);
    const b = new Map([
      ['a:1', 3],
      ['r:1', 1],
    ]);

    expect(mergeCounts(a, b)).toEqual(
      new Map([
        ['a:1', 5],
        ['r:1', 1],
      ]),
    );
    expect(a).toEqual(new Map([['a:1', 2]]));
  });
});

describe('addDecision', () => {
  it("starts a user's activity from their first decision", () => {
    expect(addDecision(undefined, decision())).toEqual({
      latest: decision(),
      requests: [{ at: decision().at, allowed: true }],
      counts: new Map([[`a:${minute}`, 1]]),
    });
  });

  it('makes the new decision the latest and the newest request, and counts it in its minute', () => {
    const older = addDecision(undefined, decision());
    const newer = decision({ at: decision().at + 500, used: 60 });

    const activity = addDecision(older, newer);

    expect(activity.latest).toBe(newer);
    expect(activity.requests.map(({ at }) => at)).toEqual([
      newer.at,
      decision().at,
    ]);
    expect(activity.counts.get(`a:${minute}`)).toBe(2);
    expect(older.requests).toHaveLength(1);
  });

  it('keeps only the newest requests', () => {
    let activity: Activity | undefined;

    for (let i = 0; i <= maxRequestsPerUpdate; i++)
      activity = addDecision(activity, decision({ at: decision().at + i }));

    expect(activity?.requests).toHaveLength(maxRequestsPerUpdate);
    expect(activity?.requests[0].at).toBe(decision().at + maxRequestsPerUpdate);
  });
});

describe('mergeActivities', () => {
  it('keeps the newer numbers, puts the older requests behind, and adds the counts up', () => {
    const older = addDecision(undefined, decision());
    const newer = addDecision(
      undefined,
      decision({ at: decision().at + 1, allowed: false, used: 60 }),
    );

    expect(mergeActivities(newer, older)).toEqual({
      latest: newer.latest,
      requests: [...newer.requests, ...older.requests],
      counts: new Map([
        [`r:${minute}`, 1],
        [`a:${minute}`, 1],
      ]),
    });
  });
});

describe('buildUpdateEvent', () => {
  it('sends the row with the requests as ISO times', () => {
    const activity = addDecision(undefined, decision());
    const row = { userId: 'user-42' } as Parameters<typeof buildUpdateEvent>[0];

    expect(buildUpdateEvent(row, activity)).toEqual({
      row,
      requests: [{ at: new Date(decision().at).toISOString(), allowed: true }],
    });
  });
});

describe('buildLimitExceededEvent', () => {
  it('sends the user, their limit, and the reset and refusal times as ISO', () => {
    const refused = decision({ allowed: false, firstRefusal: true });

    expect(buildLimitExceededEvent(refused)).toEqual({
      userId: 'user-42',
      limit: 100,
      resetAt: new Date(refused.resetAt).toISOString(),
      at: new Date(refused.at).toISOString(),
    });
  });
});
