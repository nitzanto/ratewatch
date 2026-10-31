import { adminChangeSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class AdminChangeDto extends createZodDto(adminChangeSchema) {}
