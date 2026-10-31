import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from './app/providers';
import { routes } from './app/routes';

// Dynamic imports keep MSW out of the production bundle.
if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === 'true') {
  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./mocks/handlers');
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' });
  // MSW doesn't mock Socket.IO yet (no MSW 3 binding), so the realtime connection swaps in a fake.
  const { replaceRealtime } = await import('./libs/realtime/realtime-client');
  const { connectFakeRealtime, simulateTraffic } =
    await import('./mocks/realtime');
  replaceRealtime(connectFakeRealtime);
  simulateTraffic();
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={createBrowserRouter(routes)} />
      {/* Renders nothing outside development, and the production build drops it. */}
      <ReactQueryDevtools />
    </AppProviders>
  </StrictMode>,
);
