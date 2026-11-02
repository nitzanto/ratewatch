import { usersQueries } from './users-queries';
import type { UsersQuery } from '@ratewatch/contracts';
import { useQuery } from '@tanstack/react-query';

/** The admin users table's page for this search, filters, sort and page; live events update it in place (see `useLiveDashboard`). */
export const useUsers = (query: UsersQuery) =>
  useQuery(usersQueries.list(query));
