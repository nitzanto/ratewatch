import { Crumb } from '@/components/crumb';
import { Stack, Typography } from '@mui/material';

/**
 * No users have sent a request yet: Crumb tells the admin how to make some. The Admin can't open the cookie clicker,
 * and signing in as a User in the same browser would replace their session, so it suggests a private window.
 */
export const UsersEmptyState = () => (
  <Stack sx={{ alignItems: 'center', gap: 1, py: 6 }}>
    <Crumb mood="fresh" size={96} />
    <Typography variant="h6" component="h2">
      No users yet
    </Typography>
    <Typography sx={{ color: 'text.secondary' }}>
      Users show here once they send requests.
    </Typography>
    <Typography sx={{ color: 'text.secondary' }}>
      To send some, sign in as a User in a private window and click the cookie.
    </Typography>
  </Stack>
);
