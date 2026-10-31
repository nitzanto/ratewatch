import { ROUTES } from '@/app/route-paths';
import { Crumb } from '@/components/ui/crumb';
import { Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

/** No users have sent a request yet: Crumb points the admin to the cookie clicker to make some. */
export const UsersEmptyState = () => (
  <Stack sx={{ alignItems: 'center', gap: 1, py: 6 }}>
    <Crumb mood="fresh" size={96} />
    <Typography variant="h6" component="h2">
      No users yet
    </Typography>
    <Typography sx={{ color: 'text.secondary' }}>
      Users show here once they send requests.
    </Typography>
    <Link component={RouterLink} to={ROUTES.play}>
      Open the Cookie Clicker
    </Link>
  </Stack>
);
