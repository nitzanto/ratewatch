import { userParamsSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UserParamsDto extends createZodDto(userParamsSchema) {}
