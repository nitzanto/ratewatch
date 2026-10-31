import {
  adminChangeSchema,
  extraRequestsAmount,
  type AdminChange,
  type CustomLimit,
  type Pause,
  type ResetUsers,
} from '@ratewatch/contracts';
import {
  mutationOptions,
  type MutationFunctionContext,
} from '@tanstack/react-query';
import { applyAdminChange } from './admin-users-queries';
import { api } from './api-client';

const userPath = (userId: string) =>
  `/admin/users/${encodeURIComponent(userId)}`;

/** Every change answers the changed rows, written into the cache at once. */
const onSuccess = (
  { rows }: AdminChange,
  _variables: unknown,
  _result: unknown,
  { client }: MutationFunctionContext,
) => applyAdminChange(client, rows);

export const adminControlsMutations = {
  resetLimit: () =>
    mutationOptions({
      mutationFn: (userId: string) =>
        api.post(`${userPath(userId)}/reset`, adminChangeSchema),
      onSuccess,
    }),
  resetLimits: () =>
    mutationOptions({
      mutationFn: (userIds: string[]) =>
        api.post('/admin/users/reset', adminChangeSchema, {
          body: { userIds } satisfies ResetUsers,
        }),
      onSuccess,
    }),
  addExtraRequests: () =>
    mutationOptions({
      mutationFn: (userId: string) =>
        api.post(`${userPath(userId)}/extra-requests`, adminChangeSchema, {
          body: { amount: extraRequestsAmount },
        }),
      onSuccess,
    }),
  setLimit: () =>
    mutationOptions({
      mutationFn: ({ userId, limit }: { userId: string } & CustomLimit) =>
        api.put(`${userPath(userId)}/limit`, adminChangeSchema, {
          body: { limit } satisfies CustomLimit,
        }),
      onSuccess,
    }),
  pause: () =>
    mutationOptions({
      mutationFn: ({ userId, pause }: { userId: string; pause: Pause }) =>
        api.put(`${userPath(userId)}/pause`, adminChangeSchema, {
          body: pause,
        }),
      onSuccess,
    }),
  unlock: () =>
    mutationOptions({
      mutationFn: (userId: string) =>
        api.delete(`${userPath(userId)}/pause`, adminChangeSchema),
      onSuccess,
    }),
};
