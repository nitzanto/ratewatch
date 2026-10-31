import {
  applyLimitExceeded,
  applyUserRow,
  adminUsersQueryKey,
  userIdsOnScreen,
} from '@/libs/api/admin-users-queries';
import { connectRealtime } from '@/libs/realtime/realtime-client';
import { sessionQueryKey } from '@/libs/api/session-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Keeps the users table's rows live while mounted. Returns when the connection was lost, or `null` while it isn't. */
export const useLiveUsers = () => {
  const client = useQueryClient();
  const [lostAt, setLostAt] = useState<number | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- the realtime connection is an outside system to subscribe to: opened on mount, closed on unmount.
  useEffect(() => {
    let lost = false;
    const connection = connectRealtime({
      onUpdate: ({ row }) => applyUserRow(client, row),
      onLimitExceeded: (event) => applyLimitExceeded(client, event),
      onRows: (rows) => rows.forEach((row) => applyUserRow(client, row)),
      // Asks the API who is signed in: once nobody is, the app shell sends the admin to sign in.
      onRefused: () =>
        void client.invalidateQueries({ queryKey: sessionQueryKey }),
      onStatus: (next) => {
        // Events sent while the connection was down are gone: refetch, then carry on live.
        if (lost && next === 'live')
          void client.invalidateQueries({ queryKey: adminUsersQueryKey });
        if (next === 'lost' && !lost) setLostAt(Date.now());
        if (next === 'live') setLostAt(null);
        lost = next === 'lost';
      },
    });
    // Follows whichever rows the cache holds, so a new page or a refetch changes who the API sends updates for.
    const follow = () => connection.follow(userIdsOnScreen(client));
    follow();
    const stopFollowing = client.getQueryCache().subscribe(follow);
    return () => {
      stopFollowing();
      connection.close();
    };
  }, [client]);

  return lostAt;
};
