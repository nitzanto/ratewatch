import { adminUsersQueries } from '@/libs/api/admin-users-queries';
import { useQuery } from '@tanstack/react-query';

/** The admin users table's page; live events update it in place (see `useLiveUsers`). */
export const useAdminUsers = () => useQuery(adminUsersQueries.list());
