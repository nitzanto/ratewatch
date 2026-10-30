import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { AppProviders, createQueryClient } from './app/providers';

// Dynamic imports keep MSW out of the production bundle.
if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === 'true') {
  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./mocks/handlers');
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <AppProviders queryClient={createQueryClient()}>
      <App />
    </AppProviders>
  </StrictMode>,
);
