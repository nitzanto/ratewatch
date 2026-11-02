import { LoadingPlaceholder } from '@/components/loading-placeholder';
import { useUserHistory } from '@/api/users/use-user';
import { sizes } from '@/theme/sizes';
import { formatClockTime } from '@/utils/format-time';
import type { ActivityRange } from '@ratewatch/contracts';
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { DrawerSection } from './drawer-section';

const ranges = {
  hour: { label: 'Past hour', bucket: 'minute' },
  day: { label: 'Past day', bucket: '15 minutes' },
} as const;

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

/** A user's accepted and refused requests over the past hour or day, as stacked bars, refused on top. */
export const ActivityChart = ({ userId }: { userId: string }) => {
  const [range, setRange] = useState<ActivityRange>('hour');
  const { data, isPending, isError, refetch } = useUserHistory(userId, range);
  const { label, bucket } = ranges[range];

  const chart = () => {
    if (isPending)
      return (
        <LoadingPlaceholder label="Loading the activity">
          <Skeleton variant="rectangular" height={sizes.activityChartHeight} />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Skeleton
              variant="text"
              width={48}
              sx={{ typography: 'caption' }}
            />
            <Skeleton
              variant="text"
              width={32}
              sx={{ typography: 'caption' }}
            />
          </Stack>
        </LoadingPlaceholder>
      );

    if (isError)
      return (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        >
          Couldn't load the activity.
        </Alert>
      );

    const { buckets } = data;
    const getTotal = (key: 'accepted' | 'refused') =>
      buckets.reduce((total, bucket) => total + bucket[key], 0);
    const [accepted, refused] = [getTotal('accepted'), getTotal('refused')];
    const tallest = Math.max(
      1,
      ...buckets.map((bucket) => bucket.accepted + bucket.refused),
    );
    const getBarHeight = (count: number) => `${(100 * count) / tallest}%`;

    return (
      <>
        <Box
          role="img"
          aria-label={`Requests per ${bucket} over the ${label.toLowerCase()}: ${accepted} accepted, ${refused} refused.`}
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
                  height: getBarHeight(bucket.refused),
                  bgcolor: 'error.main',
                }}
              />
              <Box
                sx={{
                  height: getBarHeight(bucket.accepted),
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
          {`${accepted} accepted and ${refused} refused in the ${label.toLowerCase()}.`}
        </Typography>
      </>
    );
  };

  return (
    <DrawerSection
      title="Activity"
      action={
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Activity range"
          value={range}
          onChange={(_, selectedRange: ActivityRange | null) =>
            selectedRange && setRange(selectedRange)
          }
        >
          {(Object.keys(ranges) as ActivityRange[]).map((rangeOption) => (
            <ToggleButton key={rangeOption} value={rangeOption}>
              {ranges[rangeOption].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {chart}
    </DrawerSection>
  );
};
