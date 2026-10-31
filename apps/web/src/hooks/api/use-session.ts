import { sessionQueries } from '@/libs/api/session-queries';
import { useQuery } from '@tanstack/react-query';

export const useSession = () => useQuery(sessionQueries.current());
