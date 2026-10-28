---
title: Validate Responses Against Their Contract
impact: MEDIUM
impactDescription: Prevents accidental data exposure and keeps responses on contract
tags: api, dto, serialization, zod
---

## Validate Responses Against Their Contract

Never return entities or internal objects straight from controllers. Each response shape is a Zod schema in `@ratewatch/contracts`; mark the handler with `@ZodSerializerDto(...)` and the global `ZodSerializerInterceptor` (registered as `APP_INTERCEPTOR`) parses the return value through the schema. Zod strips fields the schema doesn't declare, so internal fields never leak, and a response that breaks its contract fails with 500 instead of reaching clients.

**Incorrect (internal object returned as-is):**

```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.usersService.findById(id); // includes passwordHash, internal flags…
}
```

**Correct (response contract enforced by the interceptor):**

```typescript
// libs/contracts
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});

// apps/api
class UserResponseDto extends createZodDto(userResponseSchema) {}

@Get(':id')
@ZodSerializerDto(UserResponseDto)
async findOne(@Param('id') id: string): Promise<UserResponse> {
  return this.usersService.findById(id); // extra fields are stripped
}
```

Only marked handlers are checked. Leave the rate-limit hot path unmarked unless the cost is measured.

Reference: [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod)
