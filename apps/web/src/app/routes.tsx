import { DashboardPage } from '@/pages/dashboard-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlayPage } from '@/pages/play-page';
import type { RouteObject } from 'react-router';
import { AppShell } from './app-shell';
import { ROUTES } from './route-paths';

/** Every page renders inside the shell. Shared by the browser router in `main.tsx` and the memory router in tests. */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.play, element: <PlayPage /> },
      { path: ROUTES.notFound, element: <NotFoundPage /> },
    ],
  },
];
