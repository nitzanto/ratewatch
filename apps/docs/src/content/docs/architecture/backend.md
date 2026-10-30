---
title: Backend architecture
description: How the API is structured, validated and tested, and the backend decisions still to make.
sidebar:
  order: 2
---

The API (`apps/api`) is a NestJS 11 application on Express. This page covers how it's built inside: structure, cross-cutting concerns and conventions. Why NestJS 11 on Express is in [Backend framework](../../adrs/backend-framework/).

## Structure

```text
apps/api/src/
├── main.ts                    # bootstrap: /api prefix, port, readiness signal
└── app/
    ├── app.module.ts          # root module: global validation
    ├── health.controller.ts   # GET /api/health
    └── health.controller.spec.ts
```

Each feature will get its own NestJS module next to `app/` (for example `rate-limit/`), holding its controller, providers and tests. `AppModule` imports the feature modules.

## Request pipeline

```mermaid
flowchart LR
  req[Request] --> pipe["ZodValidationPipe<br/>body, query, params"]
  pipe --> handler[Controller handler]
  handler --> ser["ZodSerializerInterceptor<br/>response shape"]
  ser --> res[Response]
```

- **Input validation.** A global `ZodValidationPipe` validates every body, query and route parameter against its DTO. DTOs are built from the shared contracts with `createZodDto`.
- **Output validation.** A global `ZodSerializerInterceptor` checks the response of every route marked `@ZodSerializerDto`.
- **Rate limiting** will be an interceptor in this pipeline, ahead of the handler.

## Testing

Unit tests use Vitest with `unplugin-swc`, so NestJS's decorator metadata survives the test transform. Controllers are tested through `@nestjs/testing`. The API is also covered end to end by the `api` Playwright suite.

## Decisions to make

These are open and will be decided with the feature that needs them; each gets an ADR and a row in the [decision log](../../adrs/architecture-decisions/#decision-log).

- Rate-limit store, algorithm and failure mode (with the rate-limiting feature).
- Realtime gateway and fan-out across API instances (with the live dashboard).
- Authentication and how the user ID reaches the rate limiter (with the auth feature).
- Configuration: environment variables validated at startup.
