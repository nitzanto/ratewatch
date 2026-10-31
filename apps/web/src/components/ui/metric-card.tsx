import { Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type MetricCardProps = {
  label: string;
  value: string;
  caption: string;
  /** An 18–24px icon in the number's colour; status tints are for banners only. */
  icon: ReactNode;
  /** Announced when the value changes, as a status. */
  live?: boolean;
};

/** One summary number on the dashboard: a named region that reads "label, value, caption". */
export const MetricCard = ({
  label,
  value,
  caption,
  icon,
  live,
}: MetricCardProps) => (
  <Paper
    variant="card"
    component="section"
    aria-label={label}
    sx={{ gap: 0.75 }}
  >
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
      {icon}
    </Stack>
    <Typography
      variant="metric"
      component="p"
      role={live ? 'status' : undefined}
    >
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {caption}
    </Typography>
  </Paper>
);
