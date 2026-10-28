---
title: Validate All Input with Zod Schemas
impact: HIGH
impactDescription: First line of defense against attacks
tags: security, validation, dto, pipes, zod
---

## Validate All Input with Zod Schemas

Never trust user input. Every request body, query and route param is validated by the global `ZodValidationPipe` (from `nestjs-zod`, registered as `APP_PIPE` in `AppModule`) against a Zod schema. Request and response shapes live once in `@ratewatch/contracts`; the API turns them into DTO classes with `createZodDto`. Don't write `class-validator` DTOs: they can't be shared with the web app and would duplicate the contract (ADR 0003).

**Incorrect (raw input, or a hand-written DTO that duplicates the contract):**

```typescript
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() body: any) {
    // body could contain anything
    return this.usersService.create(body);
  }
}

// A second definition of a shape that already exists in @ratewatch/contracts
export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
}
```

**Correct (contract schema, DTO derived from it, global pipe validates):**

```typescript
// libs/contracts: the single definition, shared with the web app
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().toLowerCase(),
});
export const findUsersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20), // query strings arrive as text
});

// apps/api
class CreateUserDto extends createZodDto(createUserSchema) {}
class FindUsersQueryDto extends createZodDto(findUsersQuerySchema) {}

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // dto is parsed: unknown keys stripped, values typed
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll(query);
  }
}
```

Zod strips unknown keys by default; use `.strict()` on a schema when unknown keys must be rejected with 400 instead.

Reference: [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod), [NestJS Pipes: schema validation](https://docs.nestjs.com/pipes)
