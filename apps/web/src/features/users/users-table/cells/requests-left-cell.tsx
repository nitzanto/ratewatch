import type { UserRow } from '@ratewatch/contracts';
import { Box, LinearProgress, Typography } from '@mui/material';

const barColor = {
  ok: 'success',
  warning: 'warning',
  exceeded: 'error',
  paused: 'inherit',
} as const;

/** "41 / 100" over a bar of the limit used, in the user's status colour. */
export const RequestsLeftCell = ({ user }: { user: UserRow }) => (
  <Box>
    <Typography variant="body2">
      {user.requestsLeft} / {user.limit}
    </Typography>
    <LinearProgress
      aria-hidden
      variant="determinate"
      color={barColor[user.status]}
      value={Math.min(100, 100 * (1 - user.requestsLeft / user.limit))}
      // Only Paused's `inherit` bar takes this colour.
      sx={{ mt: 0.5, color: 'paused' }}
    />
  </Box>
);
