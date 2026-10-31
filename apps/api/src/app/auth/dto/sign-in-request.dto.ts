import { signInRequestSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class SignInRequestDto extends createZodDto(signInRequestSchema) {}
