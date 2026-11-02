import { usersSummaryQueries } from './users-summary-queries';
import { useQuery } from '@tanstack/react-query';

/** The dashboard's summary cards and top users; `rate:summary` keeps it live (see `useLiveDashboard`). */
export const useUsersSummary = () => useQuery(usersSummaryQueries.summary());
