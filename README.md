# ratewatch

A distributed per-user rate limiter (NestJS + Redis) with a real-time admin dashboard.

Docs: https://nitzanto.github.io/ratewatch/

## Getting started

**With Docker** (any Docker engine with the Compose 2.24.4+ and Buildx plugins: Docker Desktop, OrbStack, Colima, Docker Engine):

```sh
docker compose up --watch
```

The dashboard is on http://localhost:4200 and the API on http://localhost:3000/api. Edits hot-reload.

To run the production images on one origin instead: `docker compose -f compose.yaml -f compose.prod.yaml up --build`, then open http://localhost:8080.

**Natively** (for tests, linting and mock mode; needs [fnm](https://github.com/Schniz/fnm) and pnpm):

```sh
fnm use
pnpm install
pnpm nx run-many -t serve -p api web
```

See [Running locally](https://nitzanto.github.io/ratewatch/guides/running-locally/) for tests and every other command.
