import { extraRequestsSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class ExtraRequestsDto extends createZodDto(extraRequestsSchema) {}
