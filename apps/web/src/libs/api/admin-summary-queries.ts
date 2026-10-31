import {
  adminSummarySchema,
  usersQuerySchema,
  type AdminSummary,
  type UsersPage,
  type UsersQuery,
} from '@ratewatch/contracts';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { adminUsersQueryKey } from './admin-users-queries';
import { api } from './api-client';

export const adminSummaryQueryKey = ['admin', 'summary'] as const;

export const getAdminSummary = () =>
  api.get('/admin/summary', adminSummarySchema);

export const adminSummaryQueries = {
  summary: () =>
    queryOptions({ queryKey: adminSummaryQueryKey, queryFn: getAdminSummary }),
};

const { activeWithin: summaryActiveWithin } = usersQuerySchema.parse({});

/**
 * `rate:summary`, sent every second, replaces the summary on screen. Its counts are the users table's counts with no
 * search and the default last-active filter (the status filter doesn't change counts), so those pages take them too:
 * the chips then follow users off the page, whose updates the table doesn't get.
 */
export const applySummary = (client: QueryClient, summary: AdminSummary) => {
  client.setQueryData(adminSummaryQueryKey, summary);
  client.setQueriesData<UsersPage>(
    {
      queryKey: adminUsersQueryKey,
      predicate: ({ queryKey }) => {
        const query = queryKey[adminUsersQueryKey.length] as UsersQuery;
        return !query.q && query.activeWithin === summaryActiveWithin;
      },
    },
    (page) => page && { ...page, counts: summary.counts },
  );
};
