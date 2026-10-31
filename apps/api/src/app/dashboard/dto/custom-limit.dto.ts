import { customLimitSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomLimitDto extends createZodDto(customLimitSchema) {}
