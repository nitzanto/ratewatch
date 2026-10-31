import { formatClockTime } from '@/libs/utils/format-time';
import { Typography } from '@mui/material';
import { RelativeTime } from './relative-time';

/** When the user's window ends: the clock time over "in N min", or "—" once it has ended. */
export const ResetCell = ({
  resetAt,
  frozenAt,
}: {
  resetAt: string | null;
  frozenAt: number | null;
}) => {
  if (!resetAt) return '—';
  return (
    <>
      <Typography variant="body2">
        {formatClockTime(new Date(resetAt))}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        <RelativeTime at={resetAt} frozenAt={frozenAt} until />
      </Typography>
    </>
  );
};
