import {
  adminSummarySchema,
  usersQuerySchema,
  type AdminSummary,
  type UsersPage,
  type UsersQuery,
} from '@ratewatch/contracts';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { usersQueryKey } from '../users/users-queries';
import { api } from '../api-client';

export const usersSummaryQueryKey = ['users-summary'] as const;

export const getUsersSummary = () =>
  api.get('/admin/summary', adminSummarySchema);

export const usersSummaryQueries = {
  summary: () =>
    queryOptions({ queryKey: usersSummaryQueryKey, queryFn: getUsersSummary }),
};

const { activeWithin: summaryActiveWithin } = usersQuerySchema.parse({});

/**
 * `rate:summary`, sent every second, replaces the summary on screen. Its counts are the users table's counts with no
 * search and the default last-active filter (the status filter doesn't change counts), so those pages take them too:
 * the chips then follow users off the page, whose updates the table doesn't get.
 */
export const applySummary = (client: QueryClient, summary: AdminSummary) => {
  client.setQueryData(usersSummaryQueryKey, summary);
  client.setQueriesData<UsersPage>(
    {
      queryKey: usersQueryKey,
      predicate: ({ queryKey }) => {
        const pageQuery = queryKey[usersQueryKey.length] as UsersQuery;

        return (
          !pageQuery.userIdSearch &&
          pageQuery.activeWithin === summaryActiveWithin
        );
      },
    },
    (page) => page && { ...page, counts: summary.counts },
  );
};
