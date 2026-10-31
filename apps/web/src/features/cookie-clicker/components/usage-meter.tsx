import { StatusChip } from '@/components/business/status-chip';
import {
  usedShare,
  type RateLimitStatus,
} from '@/libs/rate-limit/rate-limit-status';
import { sizes } from '@/libs/theme/sizes';
import { LinearProgress, Stack, Typography } from '@mui/material';

const statusColor = {
  ok: 'success',
  warning: 'warning',
  exceeded: 'error',
} as const;

/** The usage bar with "N% used" and the status chip. Kept in the layout but hidden until there's a count, so nothing below it moves. */
export const UsageMeter = ({
  status,
  left,
}: {
  status: RateLimitStatus | undefined;
  left: number | undefined;
}) => {
  const percent = left === undefined ? 0 : Math.round(usedShare(left) * 100);

  return (
    <Stack
      sx={{
        width: sizes.usageBarWidth,
        gap: 1,
        visibility: status ? 'visible' : 'hidden',
      }}
    >
      <LinearProgress
        variant="determinate"
        aria-label="Requests used this hour"
        color={statusColor[status ?? 'ok']}
        value={percent}
      />
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
        >
          {percent}% used
        </Typography>
        {status && <StatusChip status={status} />}
      </Stack>
    </Stack>
  );
};
