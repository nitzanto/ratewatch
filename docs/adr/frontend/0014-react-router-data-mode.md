---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/33
status: accepted
---

# React Router in data mode for routing

The web app routes with React Router (`createBrowserRouter`, data mode): the most widely used React router, with the most examples and the most familiarity for agents, and stable since v7. Its loaders can prefetch through the query-options factories (ADR-0012), and framework mode is open later without a rewrite. One route table (`app/routes.tsx`) serves the browser router and the tests' memory router; every URL is a constant in `ROUTES` (`app/route-paths.ts`), used by the route table, the navigation and links. Route components live in a `pages/` layer, which extends ADR-0011.

## Considered Options

- **TanStack Router**: stronger type safety and a native fit with TanStack Query, but a younger, smaller ecosystem.
