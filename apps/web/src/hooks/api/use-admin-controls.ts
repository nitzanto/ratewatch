import { adminControlsMutations } from '@/libs/api/admin-controls-queries';
import { useMutation } from '@tanstack/react-query';

export const useResetLimit = () =>
  useMutation(adminControlsMutations.resetLimit());

/** Resets several users' limits together. */
export const useResetLimits = () =>
  useMutation(adminControlsMutations.resetLimits());

export const useAddExtraRequests = () =>
  useMutation(adminControlsMutations.addExtraRequests());
