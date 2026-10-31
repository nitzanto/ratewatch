import { ApiStatusPill } from '@/components/business/api-status-pill';
import { BrandMark } from '@/components/ui/brand-mark';
import { useSession } from '@/hooks/api/use-session';
import { useSignOut } from '@/hooks/api/use-sign-out';
import { sizes } from '@/libs/theme/sizes';
import type { Role } from '@ratewatch/contracts';
import { AppBar, Box, Button, Container, Typography } from '@mui/material';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { ROUTES } from './route-paths';

// A tab with `roles` shows only to those roles, like `@Roles` on the API.
const tabs: { to: string; label: string; roles?: Role[] }[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', roles: ['admin'] },
  { to: ROUTES.play, label: 'Cookie Clicker' },
];

const content = { maxWidth: sizes.contentMaxWidth };

/**
 * The layout route of every signed-in page: the navy app bar with Crumb, the tabs, the API status and
 * who is signed in, above the current page. Without a session it sends the visitor to sign-in, which
 * returns them to this page afterwards, unless they just signed out: the next person starts clean.
 */
export const AppShell = () => {
  const { data: session, isPending } = useSession();
  const signOut = useSignOut();
  const location = useLocation();

  if (isPending) return null;
  if (!session)
    return (
      <Navigate
        to={ROUTES.signIn}
        state={
          signOut.isPending || signOut.isSuccess
            ? undefined
            : { from: location }
        }
        replace
      />
    );

  return (
    <>
      <AppBar>
        <Container
          maxWidth={false}
          sx={{
            ...content,
            minHeight: sizes.appBarHeight,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 3,
          }}
        >
          <BrandMark component={Link} to={ROUTES.home} />
          <Box
            component="nav"
            aria-label="Main"
            sx={{ display: 'flex', alignSelf: 'stretch', flexGrow: 1 }}
          >
            {tabs
              .filter(({ roles }) => !roles || roles.includes(session.role))
              .map(({ to, label }) => (
                <Button
                  key={to}
                  variant="shellTab"
                  component={NavLink}
                  to={to}
                  end
                >
                  {label}
                </Button>
              ))}
          </Box>
          <ApiStatusPill />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'shell.muted' }}>
              {session.role === 'admin' ? 'Admin' : session.userId}
            </Typography>
            <Button
              variant="shellTab"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              Sign out
            </Button>
          </Box>
        </Container>
      </AppBar>
      <Container
        component="main"
        maxWidth={false}
        sx={{ ...content, pt: 4, pb: 6 }}
      >
        <Outlet />
      </Container>
    </>
  );
};
