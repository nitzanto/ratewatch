# apps/web

- **Call the API with relative `/api/...` URLs, never `http://localhost:3000`.** In dev Vite proxies `/api` to the API; in production nginx serves both on one origin. An absolute URL breaks production and needs CORS.
- **Parse every API response with its schema from `@ratewatch/contracts`** (`schema.parse(await res.json())`), never cast with `as`. The API is a trust boundary for the browser too.
