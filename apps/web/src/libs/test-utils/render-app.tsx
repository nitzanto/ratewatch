import App from '@/app/app';
import { AppProviders, createQueryClient } from '@/app/providers';
import { render } from '@testing-library/react';

/** Renders the whole app with its real providers and a fresh query cache. */
export const renderApp = () => {
  render(
    <AppProviders queryClient={createQueryClient()}>
      <App />
    </AppProviders>,
  );
};
