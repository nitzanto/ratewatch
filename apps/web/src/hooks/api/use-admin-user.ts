import { adminUsersQueries } from '@/libs/api/admin-users-queries';
import type { ActivityRange } from '@ratewatch/contracts';
import { useQuery } from '@tanstack/react-query';

/** One user's row and recent requests, for the user drawer; live events update it in place (see `useLiveUsers`). */
export const useAdminUser = (userId: string) =>
  useQuery(adminUsersQueries.detail(userId));

/** One user's accepted and refused requests over the past hour or day. */
export const useAdminUserHistory = (userId: string, range: ActivityRange) =>
  useQuery(adminUsersQueries.history(userId, range));
