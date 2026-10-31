import {
  adminChangeSchema,
  extraRequestsAmount,
  type ResetUsers,
} from '@ratewatch/contracts';
import { mutationOptions } from '@tanstack/react-query';
import { applyAdminChange } from './admin-users-queries';
import { api } from './api-client';

const userPath = (userId: string) =>
  `/admin/users/${encodeURIComponent(userId)}`;

/** Each change answers the changed rows, written into the cache at once. */
export const adminControlsMutations = {
  resetLimit: () =>
    mutationOptions({
      mutationFn: (userId: string) =>
        api.post(`${userPath(userId)}/reset`, adminChangeSchema),
      onSuccess: ({ rows }, _userId, _result, { client }) =>
        applyAdminChange(client, rows),
    }),
  resetLimits: () =>
    mutationOptions({
      mutationFn: (userIds: string[]) =>
        api.post('/admin/users/reset', adminChangeSchema, {
          body: { userIds } satisfies ResetUsers,
        }),
      onSuccess: ({ rows }, _userIds, _result, { client }) =>
        applyAdminChange(client, rows),
    }),
  addExtraRequests: () =>
    mutationOptions({
      mutationFn: (userId: string) =>
        api.post(`${userPath(userId)}/extra-requests`, adminChangeSchema, {
          body: { amount: extraRequestsAmount },
        }),
      onSuccess: ({ rows }, _userId, _result, { client }) =>
        applyAdminChange(client, rows),
    }),
};
