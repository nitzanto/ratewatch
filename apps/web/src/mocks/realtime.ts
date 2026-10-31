import type {
  ConnectRealtime,
  RealtimeListeners,
} from '@/libs/realtime/realtime-client';
import { afterRequest } from '@/mocks/data/users';
import { getMockUsers, setMockUsers } from '@/mocks/handlers/admin-users';
import type {
  RateLimitExceededEvent,
  RateUpdateEvent,
} from '@ratewatch/contracts';

const connections = new Set<RealtimeListeners>();
let online = true;

/** Stands in for the Socket.IO connection: connects at once, and tests send its events. */
export const connectFakeRealtime: ConnectRealtime = (listeners) => {
  connections.add(listeners);
  listeners.onStatus(online ? 'live' : 'lost');
  return () => connections.delete(listeners);
};

export const sendRateUpdate = (event: RateUpdateEvent) =>
  connections.forEach(({ onUpdate }) => onUpdate(event));

export const sendLimitExceeded = (event: RateLimitExceededEvent) =>
  connections.forEach(({ onLimitExceeded }) => onLimitExceeded(event));

/** The connection drops, and every open page waits for it to come back. */
export const dropRealtime = () => {
  online = false;
  connections.forEach(({ onStatus }) => onStatus('lost'));
};

export const restoreRealtime = () => {
  online = true;
  connections.forEach(({ onStatus }) => onStatus('live'));
};

/** Mock mode's traffic: about one request a second from a random user, through the mock API's users. */
export const simulateTraffic = () =>
  setInterval(() => {
    if (!online) return;
    const users = getMockUsers();
    const user = users[Math.floor(Math.random() * users.length)];
    if (!user) return;
    const at = new Date().toISOString();
    if (user.status === 'exceeded') {
      sendLimitExceeded({
        userId: user.userId,
        limit: user.limit,
        resetAt: user.resetAt ?? at,
        at,
      });
      return;
    }
    const next = afterRequest(user, at);
    setMockUsers(users.map((row) => (row === user ? next : row)));
    sendRateUpdate({ row: next, requests: [{ at, allowed: true }] });
  }, 1000);
