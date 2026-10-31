import { adminSummarySchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class AdminSummaryDto extends createZodDto(adminSummarySchema) {}
