/** Every page's URL, defined once for the route table, navigation and links. */
export const ROUTES = {
  /** Sends each role to its start page: the dashboard for the Admin, the cookie clicker for a User. */
  home: '/',
  dashboard: '/dashboard',
  play: '/play',
  signIn: '/sign-in',
  /** Anything no other route matches. */
  notFound: '*',
} as const;
