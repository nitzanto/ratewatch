import { LoadingPlaceholder } from '@/components/loading-placeholder';
import { sizes } from '@/theme/sizes';
import { Box, Skeleton, Stack } from '@mui/material';

const statLabels = [
  'Requests left',
  'Used this hour',
  'Last reset',
  'Next reset',
  'Last request',
  'Throttling',
];

/** The drawer while the user loads: the stats grid, the controls' buttons, the chart and the first recent requests. */
export const DetailsSkeleton = () => (
  <LoadingPlaceholder
    label="Loading the user"
    sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 2,
      }}
    >
      {statLabels.map((label) => (
        <Box key={label}>
          <Skeleton variant="text" width={80} sx={{ typography: 'caption' }} />
          <Skeleton variant="text" width={112} />
        </Box>
      ))}
    </Box>
    <Stack direction="row" sx={{ gap: 1 }}>
      <Skeleton variant="rounded" width={112} height={40} />
      <Skeleton variant="rounded" width={136} height={40} />
      <Skeleton variant="rounded" width={88} height={40} />
    </Stack>
    <Skeleton variant="rectangular" height={sizes.activityChartHeight} />
    <Stack>
      {[0, 1, 2, 3].map((position) => (
        <Stack
          key={position}
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 1,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={sizes.recentTimeWidth} />
          <Skeleton
            variant="circular"
            width={20}
            height={20}
            sx={{ ml: 'auto' }}
          />
          <Skeleton variant="text" width={64} />
        </Stack>
      ))}
    </Stack>
  </LoadingPlaceholder>
);
