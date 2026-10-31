import { HealthStatus } from '@/components/business/health-status';
import { MetricCard } from '@/components/ui/metric-card';
import { useAdminSummary } from '@/hooks/api/use-admin-summary';
import { PeopleIcon } from '@/libs/theme/icons';
import { sizes } from '@/libs/theme/sizes';
import { ExceededIcon, WarningIcon } from '@/libs/theme/status-icons';
import { Box } from '@mui/material';

const formatCount = (count: number) => count.toLocaleString('en-US');
const formatShare = (share: number) =>
  share.toLocaleString('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  });

/** The dashboard's four summary numbers, kept live by `rate:summary`; each shows a dash until the first summary arrives. */
export const SummaryCards = () => {
  const { data, isError } = useAdminSummary();
  const waiting = isError ? "Couldn't load the summary" : 'Waiting for the API';

  return (
    <Box
      component="section"
      aria-label="Summary"
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${sizes.summaryCardMin}px, 1fr))`,
        gap: 2,
      }}
    >
      <MetricCard
        label="Total users"
        value={data ? formatCount(data.totalUsers) : '—'}
        caption={data ? 'Active in the past 24 hours' : waiting}
        icon={<PeopleIcon sx={{ color: 'text.secondary' }} />}
      />
      <MetricCard
        label="Near their limit"
        value={data ? formatShare(data.nearLimitShare) : '—'}
        caption={
          data
            ? `${formatCount(data.counts.warning)} in Warning, ${formatCount(data.counts.exceeded)} Exceeded`
            : waiting
        }
        icon={<WarningIcon sx={{ color: 'warning.dark' }} />}
      />
      <MetricCard
        label="429s today (UTC)"
        value={data ? formatCount(data.refusedToday) : '—'}
        caption={data ? 'Requests refused since midnight UTC' : waiting}
        icon={<ExceededIcon sx={{ color: 'error.main' }} />}
      />
      <HealthStatus />
    </Box>
  );
};
