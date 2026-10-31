import { formatTimeAgo, formatTimeUntil } from '@/libs/utils/format-time';
import { useNow } from '../hooks/use-now';

/**
 * A past time as "8 s ago", or with `until` a future one as "in 31 min", ticking on its own so the
 * table around it doesn't re-render. The column says which: the clock can be up to a second behind,
 * so a request sent since its last tick would otherwise read as future. Counted from `frozenAt` when
 * given (the connection was lost then), so it stops moving with the data.
 */
export const RelativeTime = ({
  at,
  frozenAt,
  until = false,
}: {
  at: string;
  frozenAt: number | null;
  until?: boolean;
}) => {
  const liveNow = useNow();
  const ms = Date.parse(at) - (frozenAt ?? liveNow);
  return until ? formatTimeUntil(ms) : formatTimeAgo(-ms);
};
