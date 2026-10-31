import { clickQueries } from '@/libs/api/click-queries';
import { useQuery } from '@tanstack/react-query';

/** The user's limit as their clicks last left it; `undefined` before any click. */
export const useRateLimit = () => useQuery(clickQueries.rateLimit()).data;
