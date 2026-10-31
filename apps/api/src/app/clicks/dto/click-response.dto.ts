import { clickResponseSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class ClickResponseDto extends createZodDto(clickResponseSchema) {}
