import { DashboardPage } from '@/pages/dashboard-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlayPage } from '@/pages/play-page';
import { SignInPage } from '@/pages/sign-in-page';
import type { RouteObject } from 'react-router';
import { AppShell } from './app-shell';
import { ROUTES } from './route-paths';

/** Every page but sign-in renders inside the shell, which needs a session. Shared by the browser router in `main.tsx` and the memory router in tests. */
export const routes: RouteObject[] = [
  { path: ROUTES.signIn, element: <SignInPage /> },
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.play, element: <PlayPage /> },
      { path: ROUTES.notFound, element: <NotFoundPage /> },
    ],
  },
];
