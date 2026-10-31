import { usersQuerySchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UsersQueryDto extends createZodDto(usersQuerySchema) {}
