import { useHealth } from '@/hooks/api/use-health';
import { Alert, CircularProgress } from '@mui/material';

export const HealthStatus = () => {
  const { data, isPending, isError } = useHealth();

  if (isPending) return <CircularProgress aria-label="Loading" />;
  if (isError) return <Alert severity="error">API unreachable</Alert>;
  return (
    <Alert severity="success" role="status">
      API status: {data.status}
    </Alert>
  );
};
