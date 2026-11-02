import type {
  ConnectRealtime,
  RealtimeListeners,
} from '@/api/realtime/realtime-client';
import { afterRequest } from './data/users';
import {
  addMockRefusal,
  getMockSummary,
  getMockUsers,
  setMockUsers,
} from './handlers/admin-users';
import type {
  AdminSummary,
  RateLimitExceededEvent,
  RateUpdateEvent,
} from '@ratewatch/contracts';

const connections = new Set<RealtimeListeners>();
let online = true;
let followed: string[] = [];

/** Stands in for the Socket.IO connection: connects at once, and tests send its events. Every user's events reach it, followed or not. */
export const connectFakeRealtime: ConnectRealtime = (listeners) => {
  connections.add(listeners);
  listeners.onStatus(online ? 'live' : 'lost');

  return {
    follow: (userIds) => {
      const changed = userIds.join() !== followed.join();

      followed = userIds;

      return changed;
    },
    close: () => {
      connections.delete(listeners);
      followed = [];
    },
  };
};

/** The users the open page last asked to follow. */
export const followedUserIds = () => followed;

export const sendRateUpdate = (event: RateUpdateEvent) =>
  connections.forEach(({ onUpdate }) => onUpdate(event));

export const sendLimitExceeded = (event: RateLimitExceededEvent) =>
  connections.forEach(({ onLimitExceeded }) => onLimitExceeded(event));

export const sendSummary = (summary: AdminSummary) =>
  connections.forEach(({ onSummary }) => onSummary(summary));

/** The connection drops, and every open page waits for it to come back. */
export const dropRealtime = () => {
  online = false;
  connections.forEach(({ onStatus }) => onStatus('lost'));
};

/** The API refuses the connection, as it does once the admin's session has ended. */
export const refuseRealtime = () => {
  online = false;
  connections.forEach(({ onRefused }) => onRefused());
};

export const restoreRealtime = () => {
  online = true;
  connections.forEach(({ onStatus }) => onStatus('live'));
};

/** One request from a random mock user, sent to followers as the API would. */
const sendRandomRequest = () => {
  const users = getMockUsers();
  const user = users[Math.floor(Math.random() * users.length)];

  if (!user) return;

  const at = new Date().toISOString();

  // A refused request changes nothing but the last request, and the API still sends it to the user's followers.
  if (user.status === 'exceeded') {
    addMockRefusal();
    sendLimitExceeded({
      userId: user.userId,
      limit: user.limit,
      resetAt: user.resetAt ?? at,
      at,
    });
    const updatedUser = { ...user, lastRequestAt: at };

    setMockUsers(users.map((row) => (row === user ? updatedUser : row)));
    sendRateUpdate({ row: updatedUser, requests: [{ at, allowed: false }] });

    return;
  }

  const updatedUser = afterRequest(user, at);

  setMockUsers(users.map((row) => (row === user ? updatedUser : row)));
  sendRateUpdate({ row: updatedUser, requests: [{ at, allowed: true }] });
};

/** Mock mode's traffic: about one request a second from a random user, through the mock API's users, then the summary, as the API sends it every second. */
export const simulateTraffic = () =>
  setInterval(() => {
    if (!online) return;

    sendRandomRequest();
    sendSummary(getMockSummary());
  }, 1000);
