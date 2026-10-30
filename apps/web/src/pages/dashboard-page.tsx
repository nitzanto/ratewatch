import { HealthStatus } from '@/components/business/health-status';
import { Typography } from '@mui/material';

export const DashboardPage = () => (
  <>
    <Typography variant="h4" component="h1" gutterBottom>
      Dashboard
    </Typography>
    <HealthStatus />
  </>
);
