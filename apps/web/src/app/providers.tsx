import { theme } from '@/libs/theme/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// No automatic retries or focus refetches: against a rate-limited API each one spends the user's allowance.
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

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
