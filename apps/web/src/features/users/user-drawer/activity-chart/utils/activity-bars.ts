import type { UserHistory } from '@ratewatch/contracts';

type ActivityBucket = UserHistory['buckets'][number];

/** The accepted and refused requests across all `buckets`. */
export const getActivityTotals = (buckets: ActivityBucket[]) => ({
  accepted: buckets.reduce((total, bucket) => total + bucket.accepted, 0),
  refused: buckets.reduce((total, bucket) => total + bucket.refused, 0),
});

/** The busiest bucket's requests, at least 1, so every bar's height is a share of it. */
export const getTallestBucketTotal = (buckets: ActivityBucket[]) =>
  Math.max(1, ...buckets.map((bucket) => bucket.accepted + bucket.refused));

/** A bar's height for `count` requests, as a CSS percentage of the chart's height. */
export const buildBarHeight = (count: number, tallest: number) =>
  `${(100 * count) / tallest}%`;
