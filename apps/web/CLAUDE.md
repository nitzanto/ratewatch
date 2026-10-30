# apps/web

- **Call the API through `api` from `@/libs/api/api-client`, never `fetch` directly.** Its base URL is the relative `/api`: in dev Vite proxies it to the API; in production nginx serves both on one origin. An absolute URL like `http://localhost:3000` breaks production and needs CORS.
- **Pass every call the response's schema from `@ratewatch/contracts`** (`api.get('/health', healthResponseSchema)`). The client parses with it and infers the type from it; never cast with `as` or add a result type. The API is a trust boundary for the browser too.
- **Keep the layers** (ADR-0011): start a feature by copying the health example in each layer (`libs/api/health-queries.ts`, `hooks/api/use-health.ts`, `components/business/health-status.tsx`, `mocks/data/health.ts`, `mocks/handlers/health.ts`). Create a layer's folder with its first real file, never a `.gitkeep`.
- **Import across layers with `@/`** (the `src/` root), not long `../` chains.
- **Server state is TanStack Query** (ADR-0012). Branch on errors with `instanceof ApiError` / `RateLimitedError` from `@/libs/errors/api-error`, never by parsing messages.
- **No `useEffect`.** Lint bans it; follow the `no-use-effect` skill.
- **Desktop only.** Design and test for desktop browser windows 1280px and wider; don't add phone or tablet layouts or responsive breakpoints.
- **Pages go in `pages/`, URLs in `ROUTES`** (ADR-0014): add the URL to `app/route-paths.ts`, then the route to `app/routes.tsx`. Never write a path string in a link or route.
- **Never hardcode a colour** (lint fails on hex, `rgb()`, `hsl()` outside `libs/theme/`). Use theme tokens; add a missing one to `DESIGN.md` and `libs/theme/palette.ts` first. Fixed sizes come from `libs/theme/sizes.ts`.
- **Customise MUI components in the theme**, one file per component in `libs/theme/components/` (overrides and custom variants such as `<Button variant="shellTab">`), not with `sx` copied between call sites.
- **Component tests render with `renderApp(url)`** from `@/libs/test-utils/render-app` and assert what the user sees. Simulate errors with `server.use(...)`; never mock hooks, the client or query keys. The one exception: a `components/ui` component whose states no page reaches yet renders on its own inside the theme (`crumb.spec.tsx`).
- **Write functions and components as `const` arrow functions**, never `function` declarations.
