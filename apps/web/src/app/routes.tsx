import { DashboardPage } from '@/pages/dashboard-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlayPage } from '@/pages/play-page';
import { SignInPage } from '@/pages/sign-in-page';
import type { RouteObject } from 'react-router';
import { AppShell } from './app-shell';
import { RoleLanding, RoleRoute } from './route-guards';
import { ROUTES } from './route-paths';

/** Every page but sign-in renders inside the shell, which needs a session; each role's pages also need that role. Shared by the browser router in `main.tsx` and the memory router in tests. */
export const routes: RouteObject[] = [
  { path: ROUTES.signIn, element: <SignInPage /> },
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.home, element: <RoleLanding /> },
      {
        element: <RoleRoute allowedRole="admin" />,
        children: [{ path: ROUTES.dashboard, element: <DashboardPage /> }],
      },
      {
        element: <RoleRoute allowedRole="user" />,
        children: [{ path: ROUTES.play, element: <PlayPage /> }],
      },
      { path: ROUTES.notFound, element: <NotFoundPage /> },
    ],
  },
];
