import type { RateLimit } from '@/libs/api/click-queries';
import { clickerView, type ClickerView } from './clicker-view';

const counted = (requestsLeft: number | null, before?: number): RateLimit => ({
  kind: 'counted',
  requestsLeft,
  before,
});
const refusedAt = Date.parse('2026-10-30T18:00:00.000Z');
const refused = (retryAt: string): RateLimit => ({
  kind: 'refused',
  message: 'Too many requests.',
  retryAt: Date.parse(retryAt),
  refusedAt,
});

/** The view outside a wait; fails the test if the limit is still counting down. */
const shown = (limit: RateLimit, failed = false): ClickerView => {
  const view = clickerView(limit, failed);
  if (view.phase === 'waiting') throw new Error('expected a view, got a wait');
  return view;
};

describe('clickerView', () => {
  it('starts fresh, with no count and the hint', () => {
    expect(clickerView(undefined, false)).toEqual({
      phase: 'clicking',
      left: undefined,
      unavailable: false,
      status: undefined,
      mood: 'fresh',
      note: { kind: 'hint' },
    });
  });

  it.each([
    [100, 'fresh'],
    [81, 'fresh'],
    [80, 'warming-up'],
    [60, 'excited'],
    [40, 'focused'],
    [20, 'tired'],
    [11, 'tired'],
    [10, 'warning'],
    [0, 'exceeded'],
    // An admin's extra requests can leave more than the limit.
    [120, 'fresh'],
  ] as const)('with %i left, Crumb is %s', (left, mood) => {
    expect(shown(counted(left)).mood).toBe(mood);
  });

  it.each([
    ['crossing into a stage', counted(80, 81), { kind: 'stage', stage: 1 }],
    [
      'jumping past a stage boundary',
      counted(57, 63),
      { kind: 'stage', stage: 2 },
    ],
    ['staying inside a stage', counted(79, 80), { kind: 'hint' }],
    ['a first count', counted(80), { kind: 'hint' }],
    [
      '10 or fewer left',
      counted(5, 6),
      { kind: 'almost-out', requestsLeft: 5 },
    ],
    ['none left', counted(0, 1), { kind: 'last-request' }],
  ])('notes %s', (_, limit, note) => {
    expect(shown(limit).note).toEqual(note);
  });

  it("says the limit is unavailable, without a count or Crumb's chips, when x-count was missing", () => {
    expect(clickerView(counted(null, 5), false)).toMatchObject({
      left: undefined,
      unavailable: true,
      status: undefined,
      mood: 'unsure',
      note: { kind: 'hint' },
    });
  });

  it('waits out a refusal whose retry time is ahead', () => {
    expect(clickerView(refused('2026-10-30T18:01:30.000Z'), false)).toEqual({
      ...refused('2026-10-30T18:01:30.000Z'),
      phase: 'waiting',
    });
  });

  it('shows a refusal without a wait, and none left, when its retry time had already passed', () => {
    expect(clickerView(refused('2026-10-30T17:59:00.000Z'), false)).toEqual({
      phase: 'refused',
      left: 0,
      unavailable: false,
      status: 'exceeded',
      mood: 'exceeded',
      note: { kind: 'refused', message: 'Too many requests.', waiting: false },
    });
  });

  it('welcomes the user back after a wait, with no count until the next click', () => {
    expect(clickerView({ kind: 'reset' }, false)).toEqual({
      phase: 'back',
      left: undefined,
      unavailable: false,
      status: undefined,
      mood: 'fresh',
      note: { kind: 'welcome-back' },
    });
  });

  it('keeps the reset, not an old count, when the next click fails', () => {
    expect(clickerView({ kind: 'reset' }, true)).toMatchObject({
      phase: 'back',
      left: undefined,
      note: { kind: 'failed' },
    });
  });

  it('reports any other failed click', () => {
    expect(shown(counted(50, 51), true).note).toEqual({ kind: 'failed' });
  });
});
