import { ROUTES } from '@/app/route-paths';
import { BrandMark } from '@/components/ui/brand-mark';
import { Crumb } from '@/components/ui/crumb';
import { useSession } from '@/hooks/api/use-session';
import { useSignIn } from '@/hooks/api/use-sign-in';
import { sizes } from '@/libs/theme/sizes';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Navigate, type Path, useLocation } from 'react-router';

/**
 * A split page: the navy welcome panel with Crumb waving, and the two demo sign-in buttons. Once signed
 * in, it returns to the page the app shell sent the visitor from, else to the role's landing page.
 */
export const SignInPage = () => {
  const { data: session, isPending } = useSession();
  const signIn = useSignIn();
  // Router state, not a query parameter, so a link from another site can't choose where sign-in goes.
  const from: Path | undefined = useLocation().state?.from;

  if (isPending) return null;
  if (session)
    return (
      <Navigate
        to={from ?? (session.role === 'admin' ? ROUTES.dashboard : ROUTES.play)}
        replace
      />
    );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Box
        component="section"
        aria-label="Welcome"
        sx={{
          flex: 1,
          bgcolor: 'shell.main',
          color: 'shell.contrastText',
          px: 6,
          py: 5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <BrandMark />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: sizes.clickerStage,
              height: sizes.clickerStage,
              mb: 2.5,
              borderRadius: '50%',
              bgcolor: 'shell.raised',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crumb mood="waving" size={sizes.crumbClicker} />
          </Box>
          <Typography variant="h4" component="h2">
            Crumb says hi.
          </Typography>
          <Typography sx={{ maxWidth: sizes.signInForm, color: 'shell.muted' }}>
            Admins land on the live rate-limit dashboard. Everyone else gets the
            cookie clicker and 100 requests an hour.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'shell.muted' }}>
          Rate limits are per user, never per device or network.
        </Typography>
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          px: 3,
          py: 5,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: sizes.signInForm,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box sx={{ mb: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Sign in
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Pick a side to try. There are no passwords: ratewatch is a demo.
            </Typography>
          </Box>
          {signIn.isError && (
            <Alert severity="error">Couldn't sign in. Try again.</Alert>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={signIn.isPending}
            onClick={() => signIn.mutate('user')}
          >
            Sign in as User
          </Button>
          <Button
            variant="outlined"
            size="large"
            disabled={signIn.isPending}
            onClick={() => signIn.mutate('admin')}
          >
            Sign in as Admin
          </Button>
          <Typography variant="body2" color="text.secondary">
            Each User sign-in is a new user with their own limit, so a private
            window is a second user.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
