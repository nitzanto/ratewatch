import { healthQueries } from '@/libs/api/health-queries';
import { useQuery } from '@tanstack/react-query';

export const useHealth = () => useQuery(healthQueries.status());
