import { statusStyles } from '@/components/business/status-chip';
import { useAdminSummary } from '@/hooks/api/use-admin-summary';
import { sizes } from '@/libs/theme/sizes';
import { userStatusSchema } from '@ratewatch/contracts';
import { Box, Paper, Stack, Typography } from '@mui/material';

/** Each status's rule, beside its word. */
const rules = {
  ok: 'under 90% used',
  warning: '90% or more used',
  exceeded: 'all used',
  paused: 'never refused',
} as const;

/** The bar's fill per status: the strong colour, as the status chips use. */
const fills = {
  ok: 'success.main',
  warning: 'warning.main',
  exceeded: 'error.main',
  paused: 'paused',
} as const;

const iconColors = {
  ok: 'success.main',
  warning: 'warning.dark',
  exceeded: 'error.main',
  paused: 'paused',
} as const;

/** How many active users have each status, as one bar and a list; Paused shows only when someone is. Kept live by `rate:summary`. */
export const StatusBreakdown = () => {
  const { data } = useAdminSummary();
  if (!data) return null;
  const { counts } = data;
  const shown = userStatusSchema.options.filter(
    (status) => status !== 'paused' || counts.paused > 0,
  );

  return (
    <Paper
      variant="card"
      component="section"
      aria-labelledby="breakdown-title"
      sx={{ gap: 2 }}
    >
      <Typography variant="h6" component="h2" id="breakdown-title">
        Status breakdown
      </Typography>
      <Stack
        direction="row"
        role="img"
        aria-label={shown
          .map((status) => `${counts[status]} ${statusStyles[status].label}`)
          .join(', ')}
        sx={{
          gap: '2px',
          height: sizes.breakdownBarHeight,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'border',
        }}
      >
        {shown.map((status) => (
          <Box
            key={status}
            sx={{ flex: `${counts[status]} 1 0`, bgcolor: fills[status] }}
          />
        ))}
      </Stack>
      <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1 }}>
        {shown.map((status) => {
          const { label, Icon } = statusStyles[status];
          return (
            <Stack
              component="li"
              key={status}
              direction="row"
              sx={{ alignItems: 'center', gap: 1 }}
            >
              <Icon fontSize="small" sx={{ color: iconColors[status] }} />
              <Typography sx={{ flexGrow: 1 }}>
                {label}{' '}
                <Typography component="span" sx={{ color: 'text.secondary' }}>
                  · {rules[status]}
                </Typography>
              </Typography>
              <Typography
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {counts[status]}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};
