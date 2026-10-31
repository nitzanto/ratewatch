---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/9
status: accepted
---

# MSW 3 for API mocking in dev and component tests

The web app mocks the API with Mock Service Worker (MSW) 3. The same handlers in `apps/web/src/mocks/` serve the dev browser worker (`pnpm nx serve web -c mock`, which sets `VITE_MOCKS=true`) and the `msw/node` server in Vitest, so frontend work doesn't need a running API and tests exercise the real `fetch` path. Playwright e2e runs against the real stack, never MSW.

## Considered Options

- **Stubbing `fetch` with `vi.stubGlobal`**: no dependency, but it only works in tests, couples each test to how the app calls the network, and gives dev nothing.
- **MSW 2**: the only line `@mswjs/socket.io-binding` supports today. We take 3 rather than pin an old major for socket mocking alone, which the client module covers (below).
- **Committing `mockServiceWorker.js` to `public/`** (MSW's default setup): a generated file that must be regenerated on every MSW upgrade and ships in the production build. Instead MSW's Vite plugin in `worker-only` mode serves it from `node_modules`, in dev only.

## Consequences

- MSW doesn't mock the realtime events. They use Socket.IO, chosen for production (reconnect, rooms, a Redis adapter across API replicas), and `@mswjs/socket.io-binding` has no MSW 3 release (mswjs/socket.io-binding#21) and no namespace support (mswjs/socket.io-binding#17). Instead the app touches Socket.IO only through one client module (`libs/realtime/realtime-client.ts`), and component tests and mock mode swap in a fake (`replaceRealtime`) that emits contract-typed events. Socket.IO's wire protocol is covered by Playwright e2e against the real stack. Move socket mocks into MSW once the binding supports MSW 3.
- Tests fail on any request without a handler (`onUnhandledFrame: 'error'`), so a new endpoint needs a handler before its component test can pass.
