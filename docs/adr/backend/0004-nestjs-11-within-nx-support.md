---
area: backend
issue: https://github.com/nitzanto/ratewatch/issues/7
status: accepted
---

# NestJS 11, held to the range Nx supports

The API runs NestJS 11 although 12 is released, because `@nx/nest` 24 (the plugin that generates and builds the API) declares `@nestjs/core >=10 <12` as its peer range and pins 11 in its generators. Staying inside that range keeps the generators, build and `nx migrate` working; when `@nx/nest` supports 12, upgrade both together with `nx migrate`.

## Considered Options

- **NestJS 12 now**: outside the plugin's peer range, so every install warns and generators or migrations can break without support from either project.
- **Drop `@nx/nest` and build with the Nest CLI**: loses Nx's generators, cached builds and `affected` integration for the API, against ADR 0002.
