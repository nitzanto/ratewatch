import { useSession } from '@/hooks/api/use-session';
import { NotFoundPage } from '@/pages/not-found-page';
import type { Role } from '@ratewatch/contracts';
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

/**
 * The layout route of one role's pages: the other role gets the not-found page, so the UI never reveals they exist.
 * The dashboard is the Admin's; the cookie clicker is a User's, since the Admin's clicks are never counted.
 */
export const RoleRoute = ({ role }: { role: Role }) => {
  const { data: session } = useSession();

  return session?.role === role ? <Outlet /> : <NotFoundPage />;
};
