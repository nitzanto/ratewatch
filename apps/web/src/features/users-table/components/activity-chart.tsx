import { useAdminUserHistory } from '@/hooks/api/use-admin-user';
import { sizes } from '@/libs/theme/sizes';
import { formatClockTime } from '@/libs/utils/format-time';
import type { ActivityRange } from '@ratewatch/contracts';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  const { data, isPending, isError, refetch } = useAdminUserHistory(
    userId,
    range,
  );
  const { label, bucket } = ranges[range];

  const chart = () => {
    if (isPending)
      return <CircularProgress aria-label="Loading the activity" />;
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
    const sum = (key: 'accepted' | 'refused') =>
      buckets.reduce((total, each) => total + each[key], 0);
    const [accepted, refused] = [sum('accepted'), sum('refused')];
    const tallest = Math.max(1, ...buckets.map((b) => b.accepted + b.refused));
    const share = (count: number) => `${(100 * count) / tallest}%`;
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
          {buckets.map((each) => (
            <Stack
              key={each.start}
              sx={{ flex: '1 1 0', height: '100%', justifyContent: 'flex-end' }}
            >
              <Box
                sx={{ height: share(each.refused), bgcolor: 'error.main' }}
              />
              <Box sx={{ height: share(each.accepted), bgcolor: 'dataBar' }} />
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
          onChange={(_, next: ActivityRange | null) => next && setRange(next)}
        >
          {(Object.keys(ranges) as ActivityRange[]).map((each) => (
            <ToggleButton key={each} value={each}>
              {ranges[each].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {chart}
    </DrawerSection>
  );
};
