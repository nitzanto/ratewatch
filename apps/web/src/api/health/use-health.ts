import { healthQueries } from './health-queries';
import { useQuery } from '@tanstack/react-query';

export const useHealth = () => useQuery(healthQueries.status());
