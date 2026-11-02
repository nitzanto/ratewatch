import { AppProviders, createQueryClient } from '@/app/providers';
import { routes } from '@/app/routes';
import { sessionQueries } from '@/api/session/session-queries';
import { setMockSession } from '@/mocks/handlers/session';
import type { Role } from '@ratewatch/contracts';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

type SignedInAs = { signedInAs?: Role | null };

/** Signs the mock API in as `signedInAs` and returns a fresh query cache that already holds the session. */
const buildSignedInClient = async (signedInAs: Role | null) => {
  setMockSession(signedInAs);
  const queryClient = createQueryClient();

  await queryClient.query(sessionQueries.current());

  return queryClient;
};

/**
 * Renders the whole app at `url` with its real routes and providers and a fresh query cache,
 * signed in as a User unless `signedInAs` says otherwise (`null` for signed out). Resolves once
 * the app's own session check has answered, since until then it shows nothing.
 */
export const renderApp = async (
  url = '/',
  { signedInAs = 'user' }: SignedInAs = {},
) => {
  const queryClient = await buildSignedInClient(signedInAs);

  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [url] })}
      />
    </AppProviders>,
  );

  return queryClient;
};

/**
 * Renders one component inside the app's real providers (query cache, theme, a router), with the
 * mock API answering its calls. Signed in as a User unless `signedInAs` says otherwise. Use it for a
 * component's own spec; `renderApp` is for how a page wires its parts together.
 */
export const renderWithProviders = async (
  ui: ReactNode,
  { signedInAs = 'user' }: SignedInAs = {},
) => {
  const queryClient = await buildSignedInClient(signedInAs);

  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider
        router={createMemoryRouter([{ path: '*', element: ui }])}
      />
    </AppProviders>,
  );

  return queryClient;
};
