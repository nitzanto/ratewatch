import {
  buildBarHeight,
  getActivityTotals,
  getTallestBucketTotal,
} from './activity-bars';

const buckets = [
  { start: '2026-11-02T14:00:00.000Z', accepted: 3, refused: 1 },
  { start: '2026-11-02T14:01:00.000Z', accepted: 6, refused: 2 },
  { start: '2026-11-02T14:02:00.000Z', accepted: 0, refused: 0 },
];

it('adds up the accepted and refused requests across every bucket', () => {
  expect(getActivityTotals(buckets)).toEqual({ accepted: 9, refused: 3 });
});

it('finds the busiest bucket, and never less than 1 so an empty chart divides safely', () => {
  expect(getTallestBucketTotal(buckets)).toBe(8);
  expect(getTallestBucketTotal([buckets[2]])).toBe(1);
});

it("gives a bar's height as its share of the busiest bucket", () => {
  expect(buildBarHeight(2, 8)).toBe('25%');
  expect(buildBarHeight(8, 8)).toBe('100%');
});
