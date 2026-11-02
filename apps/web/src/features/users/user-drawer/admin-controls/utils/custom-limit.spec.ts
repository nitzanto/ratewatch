import { userRow } from '@/mocks/data/users';
import { buildSplitNote, getLimitProblem } from './custom-limit';

describe('getLimitProblem', () => {
  it('asks for a whole number from 1 to 1,000 when the field holds none', () => {
    expect(getLimitProblem(null, 0)).toBe(
      'Enter a whole number from 1 to 1,000.',
    );
  });

  it("refuses a limit that, with the window's extra requests, passes 1,000", () => {
    expect(getLimitProblem(950, 60)).toBe(
      "With 60 extra requests this hour, the limit can't go above 940.",
    );
  });

  it('has nothing to say about a limit it can save', () => {
    expect(getLimitProblem(940, 60)).toBeUndefined();
  });
});

describe('buildSplitNote', () => {
  const resetAt = new Date(2026, 10, 2, 14, 30).toISOString();
  const withExtra = userRow('user-aaaa1111', 10, 0, {
    limit: 110,
    baseLimit: 100,
    resetAt,
  });

  it("splits this hour's limit into the limit and the extra requests", () => {
    expect(buildSplitNote(withExtra, 200, 10)).toBe(
      '110 this hour = 100 limit + 10 extra, until 14:30.',
    );
  });

  it('points to Reset limit when the field holds the limit the user already has', () => {
    expect(buildSplitNote(withExtra, 100, 10)).toBe(
      '110 this hour = 100 limit + 10 extra, until 14:30. Reset limit clears the extra requests now.',
    );
  });

  it('says nothing without extra requests or without an open window', () => {
    expect(buildSplitNote(withExtra, 100, 0)).toBeUndefined();
    expect(
      buildSplitNote({ ...withExtra, resetAt: null }, 100, 10),
    ).toBeUndefined();
  });
});
