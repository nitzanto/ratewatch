import { MetricCard } from '@/components/ui/metric-card';
import { useHealth } from '@/hooks/api/use-health';
import { ExceededIcon, OkIcon } from '@/libs/theme/status-icons';
import { CircularProgress } from '@mui/material';

/** The API health summary card. `/health` never checks Redis, so OK means the API answers, not that limits are counted. */
export const HealthStatus = () => {
  const { isPending, isError } = useHealth();

  if (isPending)
    return (
      <MetricCard
        label="API health"
        value="—"
        caption="Checking the API"
        icon={<CircularProgress size={20} aria-label="Loading" />}
      />
    );
  if (isError)
    return (
      <MetricCard
        label="API health"
        value="Down"
        caption="API unreachable"
        icon={<ExceededIcon sx={{ color: 'error.main' }} />}
        live
      />
    );
  return (
    <MetricCard
      label="API health"
      value="OK"
      caption="The API answers"
      icon={<OkIcon sx={{ color: 'success.main' }} />}
      live
    />
  );
};
