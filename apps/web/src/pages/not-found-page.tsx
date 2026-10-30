import { ROUTES } from '@/app/route-paths';
import { Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

export const NotFoundPage = () => (
  <>
    <Typography variant="h4" component="h1" gutterBottom>
      Page not found
    </Typography>
    <Typography>
      There's nothing at this address.{' '}
      <Link component={RouterLink} to={ROUTES.dashboard}>
        Go to the dashboard
      </Link>
    </Typography>
  </>
);
