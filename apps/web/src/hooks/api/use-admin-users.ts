import { adminUsersQueries } from '@/libs/api/admin-users-queries';
import type { UsersQuery } from '@ratewatch/contracts';
import { useQuery } from '@tanstack/react-query';

/** The admin users table's page for this search, filters, sort and page; live events update it in place (see `useLiveUsers`). */
export const useAdminUsers = (query: UsersQuery) =>
  useQuery(adminUsersQueries.list(query));
