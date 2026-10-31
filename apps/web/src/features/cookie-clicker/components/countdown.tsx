import { formatClockTime, formatCountdown } from '@/libs/utils/format-time';
import { Stack, Typography } from '@mui/material';

/** The big countdown to the retry time, in place of the requests-left count. */
export const Countdown = ({ now, retryAt }: { now: number; retryAt: Date }) => (
  <Stack sx={{ alignItems: 'center', gap: 0.5 }}>
    <Typography variant="countHero" role="timer" sx={{ color: 'success.main' }}>
      {formatCountdown(retryAt.getTime() - now)}
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
      until Crumb is whole again and you can click at {formatClockTime(retryAt)}
    </Typography>
  </Stack>
);
