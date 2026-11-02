import { LoadingPlaceholder } from '@/components/loading-placeholder';
import { useUserHistory } from '@/api/users/use-user';
import { sizes } from '@/theme/sizes';
import type { ActivityRange } from '@ratewatch/contracts';
import {
  Alert,
  Button,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useState } from 'react';
import { DrawerSection } from '../drawer-section';
import { ActivityBars } from './activity-bars';

const ranges = {
  hour: { label: 'Past hour', bucket: 'minute' },
  day: { label: 'Past day', bucket: '15 minutes' },
} as const;

const ActivitySkeleton = () => (
  <LoadingPlaceholder label="Loading the activity">
    <Skeleton variant="rectangular" height={sizes.activityChartHeight} />
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Skeleton variant="text" width={48} sx={{ typography: 'caption' }} />
      <Skeleton variant="text" width={32} sx={{ typography: 'caption' }} />
    </Stack>
  </LoadingPlaceholder>
);

/** A user's accepted and refused requests over the past hour or day, as stacked bars, refused on top. */
export const ActivityChart = ({ userId }: { userId: string }) => {
  const [range, setRange] = useState<ActivityRange>('hour');
  const { data, isPending, isError, refetch } = useUserHistory(userId, range);
  const { label, bucket } = ranges[range];

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
      {() =>
        isPending ? (
          <ActivitySkeleton />
        ) : isError ? (
          <Alert
            severity="error"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          >
            Couldn't load the activity.
          </Alert>
        ) : (
          <ActivityBars
            buckets={data.buckets}
            rangeLabel={label}
            bucketLabel={bucket}
          />
        )
      }
    </DrawerSection>
  );
};
