---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/13
status: accepted
---

# Same origin through an nginx reverse proxy

The browser talks to one origin. In production the web image's nginx serves the built dashboard and proxies `/api` and `/socket.io` (with WebSocket upgrade headers) to the API, whose address comes from `API_URL` at container start (nginx's template rendering), not from the build. In development Vite's proxy does the same. So the API needs no CORS configuration, the dashboard needs no API or WebSocket URL baked in, and a Kubernetes Ingress later routes the same two paths (#15).

## Considered Options

- **CORS with the API on its own origin**: the dashboard needs the API URL at build time (one image per environment), every request with credentials needs preflight handling, and cookies cross origins.
- **The API serving the dashboard's static files**: one container, but static caching, compression and security headers move into Node, and the dashboard can't scale or deploy separately.
- **A separate gateway (Traefik, Envoy)**: same origin too, but a third container for two routes nginx already handles.

## Consequences

- The web image's nginx config (`apps/web/nginx/default.conf.template`) owns caching (`immutable` for hashed `/assets/`, `no-cache` for `index.html`, none added to API responses) and the security headers. Headers are set once at server level and selected through a `map`, because a location with its own `add_header` drops the server's.
- With `read_only: true`, `/etc/nginx/conf.d` must be a writable tmpfs owned by uid 101 so the template can render.
- The API is not published in the production-like compose run; only nginx is.
