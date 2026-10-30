import { endWait } from '@/libs/api/click-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/** Marks the limit as reset once a refusal's wait has run out. Stable, so a timer depending on it isn't restarted. */
export const useEndWait = () => {
  const client = useQueryClient();
  return useCallback(() => endWait(client), [client]);
};
