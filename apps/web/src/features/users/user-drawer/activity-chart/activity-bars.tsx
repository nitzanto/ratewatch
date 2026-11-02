import { sizes } from '@/theme/sizes';
import { formatClockTime } from '@/utils/format-time';
import type { UserHistory } from '@ratewatch/contracts';
import { Box, Stack, Typography } from '@mui/material';
import {
  buildBarHeight,
  getActivityTotals,
  getTallestBucketTotal,
} from './utils/activity-bars';

const LegendKey = ({ color, label }: { color: string; label: string }) => (
  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
    <Box
      sx={{
        width: sizes.legendKey,
        height: sizes.legendKey,
        borderRadius: 0.5,
        bgcolor: color,
      }}
      aria-hidden
    />
    {label}
  </Stack>
);

/** The loaded activity: stacked bars (refused on top), the time axis with its legend, and the totals in words. */
export const ActivityBars = ({
  buckets,
  rangeLabel,
  bucketLabel,
}: {
  buckets: UserHistory['buckets'];
  /** The range's label, such as "Past hour". */
  rangeLabel: string;
  /** How long one bar is, such as "minute". */
  bucketLabel: string;
}) => {
  const { accepted, refused } = getActivityTotals(buckets);
  const tallest = getTallestBucketTotal(buckets);

  return (
    <>
      <Box
        role="img"
        aria-label={`Requests per ${bucketLabel} over the ${rangeLabel.toLowerCase()}: ${accepted} accepted, ${refused} refused.`}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: `${sizes.activityBarGap}px`,
          height: sizes.activityChartHeight,
          borderBottom: 1,
          borderColor: 'border',
        }}
      >
        {buckets.map((bucket) => (
          <Stack
            key={bucket.start}
            sx={{ flex: '1 1 0', height: '100%', justifyContent: 'flex-end' }}
          >
            <Box
              sx={{
                height: buildBarHeight(bucket.refused, tallest),
                bgcolor: 'error.main',
              }}
            />
            <Box
              sx={{
                height: buildBarHeight(bucket.accepted, tallest),
                bgcolor: 'dataBar',
              }}
            />
          </Stack>
        ))}
      </Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          typography: 'caption',
          color: 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{formatClockTime(new Date(buckets[0].start))}</span>
        <Stack direction="row" sx={{ gap: 2 }}>
          <LegendKey color="dataBar" label="Accepted" />
          <LegendKey color="error.main" label="Refused" />
        </Stack>
        <span>Now</span>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {`${accepted} accepted and ${refused} refused in the ${rangeLabel.toLowerCase()}.`}
      </Typography>
    </>
  );
};
