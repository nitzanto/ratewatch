import { userHistoryQuerySchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UserHistoryQueryDto extends createZodDto(userHistoryQuerySchema) {}
