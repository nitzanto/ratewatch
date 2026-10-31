import { resetUsersSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class ResetUsersDto extends createZodDto(resetUsersSchema) {}
