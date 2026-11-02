import { usersQueries } from './users-queries';
import type { ActivityRange } from '@ratewatch/contracts';
import { useQuery } from '@tanstack/react-query';

/** One user's row and recent requests, for the user drawer; live events update it in place (see `useLiveDashboard`). */
export const useUser = (userId: string) =>
  useQuery(usersQueries.detail(userId));

/** One user's accepted and refused requests over the past hour or day. */
export const useUserHistory = (userId: string, range: ActivityRange) =>
  useQuery(usersQueries.history(userId, range));
