---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/6
status: accepted
---

# Shared Zod contracts between api and web

Every request, response (body and the headers a client reads, such as `x-count`) and WebSocket event shape the API and web app exchange is defined once, as a Zod schema in `libs/contracts` (`@ratewatch/contracts`, tagged `scope:shared`). Each schema exports its inferred TypeScript type, so the API validates untrusted input at runtime and the web app gets compile-time types from the same definition, and a breaking shape change fails the build of both consumers in the same PR.

## Considered Options

- **TypeScript types only**: no runtime validation at the trust boundary; the API would need a second validation layer that can drift from the types.
- **OpenAPI-first with generated clients**: a spec file plus a codegen step for every change, and WebSocket events sit outside OpenAPI anyway.
- **NestJS DTO classes with `class-validator`**: decorators tie the shapes to Nest, so the web app cannot import them without pulling in the backend.
- **tRPC**: end-to-end types without schemas in a lib, but it replaces REST and `@nestjs/websockets` with its own transport.

## Consequences

- `libs/contracts` holds shapes and the constants both apps must agree on (header names, the default limit, status thresholds): no business logic, and no imports from `scope:api` or `scope:web` (enforced by the module boundary rule).
- Files in `libs/contracts/src/lib/` are named `<resource>.<kind>.ts`: `.schema.ts` for Zod schemas and their inferred types, `.constants.ts` for shared values. One resource per file (`click.schema.ts`, `rate-limit.schema.ts`, `rate-limit.constants.ts`), each re-exported from `src/index.ts`.
- Zod is a runtime dependency of both apps.
- The API validates with `nestjs-zod`: a global `ZodValidationPipe` checks every body, query and param against its schema, and a global `ZodSerializerInterceptor` checks the responses of routes marked `@ZodSerializerDto`. DTO classes are built from the contracts with `createZodDto`, never written by hand. NestJS 12's built-in `StandardSchemaValidationPipe` can replace the library after the upgrade in ADR 0004.

_Amended 2026-10-29 ([#7](https://github.com/nitzanto/ratewatch/issues/7)): added how the API validates._
_Amended 2026-10-31 ([#34](https://github.com/nitzanto/ratewatch/issues/34)): added shared constants, response header schemas and the file naming._
