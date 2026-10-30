# apps/web

- **Call the API through `api` from `@/libs/api/api-client`, never `fetch` directly.** Its base URL is the relative `/api`: in dev Vite proxies it to the API; in production nginx serves both on one origin. An absolute URL like `http://localhost:3000` breaks production and needs CORS.
- **Pass every call the response's schema from `@ratewatch/contracts`** (`api.get('/health', healthResponseSchema)`). The client parses with it and infers the type from it; never cast with `as` or add a result type. The API is a trust boundary for the browser too.
- **Keep the layers** (ADR-0011): start a feature by copying the health example in each layer (`libs/api/health-queries.ts`, `hooks/api/use-health.ts`, `components/business/health-status.tsx`, `mocks/data/health.ts`, `mocks/handlers/health.ts`). Create a layer's folder with its first real file, never a `.gitkeep`.
- **Import across layers with `@/`** (the `src/` root), not long `../` chains.
- **Server state is TanStack Query** (ADR-0012). Branch on errors with `instanceof ApiError` / `RateLimitedError` from `@/libs/errors/api-error`, never by parsing messages.
- **No `useEffect`.** Lint bans it; follow the `no-use-effect` skill.
- **Component tests render with `renderApp()`** from `@/libs/test-utils/render-app` and assert what the user sees. Simulate errors with `server.use(...)`; never mock hooks, the client or query keys.
- **Write functions and components as `const` arrow functions**, never `function` declarations.
