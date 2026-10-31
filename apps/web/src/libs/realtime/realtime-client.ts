import {
  rateLimitExceededEventSchema,
  rateSubscribeAckSchema,
  rateUpdateEventSchema,
  realtimeEvents,
  type RateLimitExceededEvent,
  type RateUpdateEvent,
  type UserRow,
} from '@ratewatch/contracts';
import { io } from 'socket.io-client';

/** `connecting` until the first connection, then `live`, or `lost` while it reconnects. */
export type RealtimeStatus = 'connecting' | 'live' | 'lost';

export type RealtimeListeners = {
  onUpdate: (event: RateUpdateEvent) => void;
  onLimitExceeded: (event: RateLimitExceededEvent) => void;
  /** The followed users' current rows, answered to each subscription. */
  onRows: (rows: UserRow[]) => void;
  onStatus: (status: RealtimeStatus) => void;
  /** The API refused the connection, as it does once the admin's session has ended; it won't be retried. */
  onRefused: () => void;
};

export type RealtimeConnection = {
  /** Follows these users from now on, instead of the ones before; the API sends updates only for followed users. */
  follow: (userIds: string[]) => void;
  close: () => void;
};

/** Opens the admin's live connection. */
export type ConnectRealtime = (
  listeners: RealtimeListeners,
) => RealtimeConnection;

/** How long the API has to answer a subscription before the connection is restarted. */
const subscribeTimeoutMs = 5000;

/**
 * The only place the app touches Socket.IO, so component tests and mock mode swap in a fake here
 * (`replaceRealtime`). On the page's own origin, like the API client: the session cookie
 * authenticates the handshake, and Socket.IO reconnects by itself after a dropped connection.
 * WebSocket only: HTTP long-polling would need sticky sessions across API instances.
 */
const connectSocket: ConnectRealtime = ({
  onUpdate,
  onLimitExceeded,
  onRows,
  onStatus,
  onRefused,
}) => {
  const socket = io({ transports: ['websocket'] });
  let followed: string[] = [];
  // A new connection follows nobody, so every connect sends the subscription again.
  const subscribe = () =>
    socket
      .timeout(subscribeTimeoutMs)
      .emitWithAck(realtimeEvents.subscribe, { userIds: followed })
      .then((ack) => onRows(rateSubscribeAckSchema.parse(ack).rows))
      // Unanswered or malformed: no update would arrive, so restart, which shows the connection lost and tries
      // again. A disconnect fails it too, and then the reconnect (or the close) already takes care of it.
      .catch(() => {
        if (socket.connected) socket.disconnect().connect();
      });
  socket.on('connect', () => {
    onStatus('live');
    void subscribe();
  });
  // The API ends the connection itself when the admin's session does, and refuses it at the handshake from
  // then on. Neither is retried, unlike a network failure.
  socket.on('disconnect', (reason) => {
    onStatus('lost');
    if (reason === 'io server disconnect') onRefused();
  });
  socket.on('connect_error', () => {
    onStatus('lost');
    if (!socket.active) onRefused();
  });
  // The API is a trust boundary here too: parse, don't cast.
  socket.on(realtimeEvents.update, (payload) =>
    onUpdate(rateUpdateEventSchema.parse(payload)),
  );
  socket.on(realtimeEvents.limitExceeded, (payload) =>
    onLimitExceeded(rateLimitExceededEventSchema.parse(payload)),
  );
  return {
    follow: (userIds) => {
      if (userIds.join() === followed.join()) return;
      followed = userIds;
      if (socket.connected) void subscribe();
    },
    close: () => socket.disconnect(),
  };
};

let connect = connectSocket;

/** Swaps in a fake (tests and mock mode): every connection from now on goes to `fake` instead of the API. */
export const replaceRealtime = (fake: ConnectRealtime) => {
  connect = fake;
};

let status: RealtimeStatus | null = null;
const statusListeners = new Set<() => void>();

const setStatus = (next: RealtimeStatus | null) => {
  status = next;
  statusListeners.forEach((listener) => listener());
};

/** The open connection's status for the app bar, or `null` while no page holds one. For `useSyncExternalStore`. */
export const realtimeStatusStore = {
  subscribe: (listener: () => void) => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
  get: () => status,
};

export const connectRealtime: ConnectRealtime = (listeners) => {
  const connection = connect({
    ...listeners,
    onStatus: (next) => {
      setStatus(next);
      listeners.onStatus(next);
    },
  });
  return {
    ...connection,
    close: () => {
      connection.close();
      setStatus(null);
    },
  };
};
