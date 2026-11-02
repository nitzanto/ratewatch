import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import { sizes } from '@/libs/theme/sizes';
import { Box, Paper, Skeleton, Stack } from '@mui/material';

/** Varied, so the placeholder rows read as a list of IDs rather than a grid of identical bars. */
const userIdWidths = [132, 118, 140, 124, 112, 136, 128];
const filterChipWidths = [64, 92, 104, 88, 56];

/** The table's column widths at the dashboard's width, so each placeholder sits under its header: checkbox, user, requests left, reset, status; last request takes the rest. */
const columnWidths = [53, 157, 184, 148, 148];

/** One placeholder row, in the users table's columns. */
const RowSkeleton = ({ userIdWidth }: { userIdWidth: number }) => (
  <Stack
    direction="row"
    sx={{
      alignItems: 'center',
      px: 2,
      flex: '1 1 0',
      borderBottom: 1,
      borderColor: 'divider',
      '& > *': { flexShrink: 0 },
    }}
  >
    <Box sx={{ width: columnWidths[0] }}>
      <Skeleton variant="rounded" width={18} height={18} />
    </Box>
    <Box sx={{ width: columnWidths[1] }}>
      <Skeleton variant="text" width={userIdWidth - 24} />
    </Box>
    <Stack sx={{ gap: 0.75, width: columnWidths[2] }}>
      <Skeleton variant="text" width={56} />
      <Skeleton
        variant="rounded"
        width={150}
        height={sizes.usageBarHeight}
        sx={{ borderRadius: sizes.usageBarHeight / 2 }}
      />
    </Stack>
    <Stack sx={{ width: columnWidths[3] }}>
      <Skeleton variant="text" width={88} />
      <Skeleton variant="text" width={56} sx={{ typography: 'caption' }} />
    </Stack>
    <Box sx={{ width: columnWidths[4] }}>
      <Skeleton
        variant="rounded"
        width={84}
        height={sizes.statusChipHeight}
        sx={{ borderRadius: sizes.statusChipHeight / 2 }}
      />
    </Box>
    <Skeleton variant="text" width={64} />
  </Stack>
);

/** The users card while its first page loads: the same heading row, filter row, table height and pager, so nothing moves when the rows arrive. */
export const UsersTableSkeleton = () => (
  <LoadingPlaceholder label="Loading users">
    <Paper variant="outlined">
      <Stack sx={{ gap: 2, p: 2 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Skeleton variant="text" width={64} sx={{ typography: 'h6' }} />
          <Skeleton variant="rounded" width={sizes.searchWidth} height={40} />
        </Stack>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', gap: 1, height: sizes.filterRowHeight }}
        >
          {filterChipWidths.map((width) => (
            <Skeleton
              key={width}
              variant="rounded"
              width={width}
              height={sizes.filterChipHeight}
              sx={{ borderRadius: sizes.filterChipHeight / 2 }}
            />
          ))}
        </Stack>
      </Stack>
      <Stack sx={{ height: sizes.usersTableHeight }}>
        <Box
          sx={{
            height: 48,
            flexShrink: 0,
            bgcolor: 'surfaceSunken',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        />
        {userIdWidths.map((width) => (
          <RowSkeleton key={width} userIdWidth={width} />
        ))}
      </Stack>
      <Stack
        direction="row"
        sx={{ justifyContent: 'flex-end', gap: 3, px: 2, py: 1.5 }}
      >
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={72} />
      </Stack>
    </Paper>
  </LoadingPlaceholder>
);
