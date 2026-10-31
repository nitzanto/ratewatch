import {
  applyLimitExceeded,
  applyUserRow,
  adminUsersQueryKey,
} from '@/libs/api/admin-users-queries';
import { connectRealtime } from '@/libs/realtime/realtime-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Keeps the users table's rows live while mounted. Returns when the connection was lost, or `null` while it isn't. */
export const useLiveUsers = () => {
  const client = useQueryClient();
  const [lostAt, setLostAt] = useState<number | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- the realtime connection is an outside system to subscribe to: opened on mount, closed on unmount.
  useEffect(() => {
    let lost = false;
    return connectRealtime({
      onUpdate: ({ row }) => applyUserRow(client, row),
      onLimitExceeded: (event) => applyLimitExceeded(client, event),
      onStatus: (next) => {
        // Events sent while the connection was down are gone: refetch, then carry on live.
        if (lost && next === 'live')
          void client.invalidateQueries({ queryKey: adminUsersQueryKey });
        if (next === 'lost' && !lost) setLostAt(Date.now());
        if (next === 'live') setLostAt(null);
        lost = next === 'lost';
      },
    });
  }, [client]);

  return lostAt;
};
