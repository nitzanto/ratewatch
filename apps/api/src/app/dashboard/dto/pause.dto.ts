import { pauseSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class PauseDto extends createZodDto(pauseSchema) {}
