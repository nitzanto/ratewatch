import type { RealtimeStatus } from './realtime-client';

/**
 * When the live connection was lost, after it moves to `connectionStatus`: set when it goes down, kept while it
 * stays down (so a second "lost" doesn't move the time), and cleared once it's live again. `null` while it isn't
 * lost.
 */
export const getConnectionLostAt = (
  connectionLostAt: number | null,
  connectionStatus: RealtimeStatus,
  now: number,
): number | null => {
  if (connectionStatus === 'live') return null;

  if (connectionStatus === 'lost') return connectionLostAt ?? now;

  return connectionLostAt;
};
