import { endSessionOnUnauthorized } from '@/libs/api/session-queries';
import { theme } from '@/libs/theme/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';

// No automatic retries or focus refetches: against a rate-limited API each one spends the user's allowance.
// Every failed query and mutation passes through the 401 check, so no page handles a session ending itself.
export const createQueryClient = () => {
  const onError = (error: Error) => endSessionOnUnauthorized(client, error);
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return client;
};

/** Everything the app needs around it; shared by `main.tsx` and the test render helper. */
export const AppProviders = ({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  </QueryClientProvider>
);
