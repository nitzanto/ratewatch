import { sessionSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class SessionDto extends createZodDto(sessionSchema) {}
