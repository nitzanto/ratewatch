import { AppProviders, createQueryClient } from '@/app/providers';
import { routes } from '@/app/routes';
import { sessionQueries } from '@/libs/api/session-queries';
import { setMockSession } from '@/mocks/handlers/session';
import type { Role } from '@ratewatch/contracts';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/**
 * Renders the whole app at `url` with its real routes and providers and a fresh query cache,
 * signed in as a User unless `signedInAs` says otherwise (`null` for signed out). Resolves once
 * the app's own session check has answered, since until then it shows nothing.
 */
export const renderApp = async (
  url = '/',
  { signedInAs = 'user' }: { signedInAs?: Role | null } = {},
) => {
  setMockSession(signedInAs);
  const queryClient = createQueryClient();
  await queryClient.query(sessionQueries.current());
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [url] })}
      />
    </AppProviders>,
  );
};
