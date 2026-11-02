import { formatClockTime } from '@/utils/format-time';
import { Alert } from '@mui/material';

type ConnectionLostBannerProps = {
  /** When the live connection dropped, in epoch ms. */
  lostAt: number;
};

/** Says the users shown are as of when the live connection dropped. */
export const ConnectionLostBanner = ({ lostAt }: ConnectionLostBannerProps) => (
  <Alert severity="info">
    Connection lost. Showing the users as of {formatClockTime(new Date(lostAt))}
    ; reconnecting…
  </Alert>
);
