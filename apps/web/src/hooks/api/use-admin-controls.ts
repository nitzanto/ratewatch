import { adminControlsMutations } from '@/libs/api/admin-controls-queries';
import { useMutation } from '@tanstack/react-query';

export const useResetLimit = () =>
  useMutation(adminControlsMutations.resetLimit());

/** Resets several users' limits together. */
export const useResetLimits = () =>
  useMutation(adminControlsMutations.resetLimits());

export const useAddExtraRequests = () =>
  useMutation(adminControlsMutations.addExtraRequests());

/** Sets a user's limit in every window; 100 clears their custom limit. */
export const useSetLimit = () => useMutation(adminControlsMutations.setLimit());

export const usePause = () => useMutation(adminControlsMutations.pause());

export const useUnlock = () => useMutation(adminControlsMutations.unlock());
