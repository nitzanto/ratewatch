import { userHistorySchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UserHistoryDto extends createZodDto(userHistorySchema) {}
