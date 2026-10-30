import { ApiStatusPill } from '@/components/business/api-status-pill';
import { Crumb } from '@/components/ui/crumb';
import { sizes } from '@/libs/theme/sizes';
import { AppBar, Box, Button, Container } from '@mui/material';
import { Link, NavLink, Outlet } from 'react-router';
import { ROUTES } from './route-paths';

const tabs = [
  { to: ROUTES.dashboard, label: 'Dashboard' },
  { to: ROUTES.play, label: 'Cookie clicker' },
];

const content = { maxWidth: sizes.contentMaxWidth };

/** The root layout route: the navy app bar with Crumb, the tabs and the API status, above the current page. */
export const AppShell = () => (
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
        <Box
          component={Link}
          to={ROUTES.dashboard}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'inherit',
            textDecoration: 'none',
            typography: 'h6',
          }}
        >
          <Crumb mood="mark" size={sizes.crumbMark} />
          ratewatch
        </Box>
        <Box
          component="nav"
          aria-label="Main"
          sx={{ display: 'flex', alignSelf: 'stretch', flexGrow: 1 }}
        >
          {tabs.map(({ to, label }) => (
            <Button key={to} variant="shellTab" component={NavLink} to={to} end>
              {label}
            </Button>
          ))}
        </Box>
        <ApiStatusPill />
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
