import {
  applyLimitExceeded,
  applyRateUpdate,
  applyUserRow,
  usersQueryKey,
  getUserIdsOnScreen,
} from '../users/users-queries';
import { applySummary } from '../users-summary/users-summary-queries';
import { getConnectionLostAt } from './connection-lost-at';
import { connectRealtime } from './realtime-client';
import { sessionQueryKey } from '../session/session-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Keeps the users table's rows, the open user and the summary live while mounted. Returns when the connection was lost, or `null` while it isn't. */
export const useLiveDashboard = () => {
  const client = useQueryClient();
  const [connectionLostAt, setConnectionLostAt] = useState<number | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- the realtime connection is an outside system to subscribe to: opened on mount, closed on unmount.
  useEffect(() => {
    let lost = false;

    // Step 1: open the connection, and write each event into the cache.
    const connection = connectRealtime({
      onUpdate: (event) => applyRateUpdate(client, event),
      onLimitExceeded: (event) => applyLimitExceeded(client, event),
      onSummary: (summary) => applySummary(client, summary),
      onRows: (rows) => rows.forEach((row) => applyUserRow(client, row)),
      // Asks the API who is signed in: once nobody is, the app shell sends the admin to sign in.
      onRefused: () =>
        void client.invalidateQueries({ queryKey: sessionQueryKey }),
      onStatus: (connectionStatus) => {
        // Events sent while the connection was down are gone: refetch, then carry on live.
        if (lost && connectionStatus === 'live')
          void client.invalidateQueries({ queryKey: usersQueryKey });

        setConnectionLostAt((connectionLostAt) =>
          getConnectionLostAt(connectionLostAt, connectionStatus, Date.now()),
        );
        lost = connectionStatus === 'lost';
      },
    });

    // Step 2: follow the users on screen, now and whenever the cache changes (a new page, a refetch, the open user).
    const followUsersOnScreen = () =>
      connection.follow(getUserIdsOnScreen(client));

    followUsersOnScreen();
    const stopFollowing = client.getQueryCache().subscribe(followUsersOnScreen);

    // Step 3: stop following and close the connection on unmount.
    return () => {
      stopFollowing();
      connection.close();
    };
  }, [client]);

  return connectionLostAt;
};
