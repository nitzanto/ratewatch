/** Every page's URL, defined once for the route table, navigation and links. */
export const ROUTES = {
  dashboard: '/',
  play: '/play',
  /** Anything no other route matches. */
  notFound: '*',
} as const;
