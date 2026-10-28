---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/6
status: accepted
---

# Shared Zod contracts between api and web

Every request, response and WebSocket event shape the API and web app exchange is defined once, as a Zod schema in `libs/contracts` (`@ratewatch/contracts`, tagged `scope:shared`). Each schema exports its inferred TypeScript type, so the API validates untrusted input at runtime and the web app gets compile-time types from the same definition, and a breaking shape change fails the build of both consumers in the same PR.

## Considered Options

- **TypeScript types only**: no runtime validation at the trust boundary; the API would need a second validation layer that can drift from the types.
- **OpenAPI-first with generated clients**: a spec file plus a codegen step for every change, and WebSocket events sit outside OpenAPI anyway.
- **NestJS DTO classes with `class-validator`**: decorators tie the shapes to Nest, so the web app cannot import them without pulling in the backend.
- **tRPC**: end-to-end types without schemas in a lib, but it replaces REST and `@nestjs/websockets` with its own transport.

## Consequences

- `libs/contracts` holds shapes only: no business logic, and no imports from `scope:api` or `scope:web` (enforced by the module boundary rule).
- Zod is a runtime dependency of both apps.
