import { AppProviders, createQueryClient } from '@/app/providers';
import { routes } from '@/app/routes';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/** Renders the whole app at `url` with its real routes and providers and a fresh query cache. */
export const renderApp = (url = '/') => {
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [url] })}
      />
    </AppProviders>,
  );
};
