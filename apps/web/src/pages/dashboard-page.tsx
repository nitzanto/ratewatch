import { HealthStatus } from '@/components/business/health-status';
import { LiveUsers } from '@/features/users-table/components/live-users';
import { Stack, Typography } from '@mui/material';

export const DashboardPage = () => (
  <>
    <Typography variant="h4" component="h1" gutterBottom>
      Dashboard
    </Typography>
    <Stack sx={{ gap: 3 }}>
      <HealthStatus />
      <LiveUsers />
    </Stack>
  </>
);
