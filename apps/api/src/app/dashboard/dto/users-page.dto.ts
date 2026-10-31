import { usersPageSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UsersPageDto extends createZodDto(usersPageSchema) {}
