import { useSession } from '@/hooks/api/use-session';
import { NotFoundPage } from '@/pages/not-found-page';
import { Navigate, Outlet } from 'react-router';
import { ROUTES } from './route-paths';

// Both render inside the app shell, which only renders once there's a session.

/** The home route: sends each role to its start page. */
export const RoleLanding = () => {
  const { data: session } = useSession();
  return (
    <Navigate
      to={session?.role === 'admin' ? ROUTES.dashboard : ROUTES.play}
      replace
    />
  );
};

/** The layout route of admin pages: a User gets the not-found page, so the UI never reveals they exist. */
export const AdminRoute = () => {
  const { data: session } = useSession();
  return session?.role === 'admin' ? <Outlet /> : <NotFoundPage />;
};
