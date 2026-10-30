import { healthResponseSchema } from '@ratewatch/contracts';
import { queryOptions } from '@tanstack/react-query';
import { api } from './api-client';

export const healthQueryKey = ['health'] as const;

export const getHealth = () => api.get('/health', healthResponseSchema);

export const healthQueries = {
  status: () => queryOptions({ queryKey: healthQueryKey, queryFn: getHealth }),
};
