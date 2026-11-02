import { StatusBreakdown } from '@/features/analytics/status-breakdown';
import { SummaryCards } from '@/features/analytics/summary-cards';
import { TopUsers } from '@/features/analytics/top-users';
import { UsersPanel } from '@/features/users/users-panel';
import { sizes } from '@/theme/sizes';
import { Box, Stack, Typography } from '@mui/material';

export const DashboardPage = () => (
  <>
    <Typography variant="h4" component="h1" gutterBottom>
      Dashboard
    </Typography>
    <Stack sx={{ gap: 3 }}>
      <SummaryCards />
      <Stack
        direction="row"
        sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}
      >
        <Box sx={{ flex: `999 1 ${sizes.mainColumnBasis}px`, minWidth: 0 }}>
          <UsersPanel />
        </Box>
        <Stack
          sx={{ flex: `1 1 ${sizes.sideColumnBasis}px`, minWidth: 0, gap: 2 }}
        >
          <StatusBreakdown />
          <TopUsers />
        </Stack>
      </Stack>
    </Stack>
  </>
);
