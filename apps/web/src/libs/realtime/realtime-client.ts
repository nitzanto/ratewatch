import {
  rateLimitExceededEventSchema,
  rateUpdateEventSchema,
  realtimeEvents,
  type RateLimitExceededEvent,
  type RateUpdateEvent,
} from '@ratewatch/contracts';
import { io } from 'socket.io-client';

/** `connecting` until the first connection, then `live`, or `lost` while it reconnects. */
export type RealtimeStatus = 'connecting' | 'live' | 'lost';

export type RealtimeListeners = {
  onUpdate: (event: RateUpdateEvent) => void;
  onLimitExceeded: (event: RateLimitExceededEvent) => void;
  onStatus: (status: RealtimeStatus) => void;
};

/** Opens the admin's live connection and returns the function that closes it. */
export type ConnectRealtime = (listeners: RealtimeListeners) => () => void;

/**
 * The only place the app touches Socket.IO, so component tests and mock mode swap in a fake here
 * (`replaceRealtime`). On the page's own origin, like the API client: the session cookie
 * authenticates the handshake, and Socket.IO reconnects by itself.
 */
const connectSocket: ConnectRealtime = ({
  onUpdate,
  onLimitExceeded,
  onStatus,
}) => {
  const socket = io();
  socket.on('connect', () => onStatus('live'));
  socket.on('disconnect', () => onStatus('lost'));
  socket.on('connect_error', () => onStatus('lost'));
  // The API is a trust boundary here too: parse, don't cast.
  socket.on(realtimeEvents.update, (payload) =>
    onUpdate(rateUpdateEventSchema.parse(payload)),
  );
  socket.on(realtimeEvents.limitExceeded, (payload) =>
    onLimitExceeded(rateLimitExceededEventSchema.parse(payload)),
  );
  return () => socket.disconnect();
};

let connect = connectSocket;

/** Swaps in a fake (tests and mock mode): every connection from now on goes to `fake` instead of the API. */
export const replaceRealtime = (fake: ConnectRealtime) => {
  connect = fake;
};

export const connectRealtime: ConnectRealtime = (listeners) =>
  connect(listeners);
