import { userDetailSchema } from '@ratewatch/contracts';
import { createZodDto } from 'nestjs-zod';

export class UserDetailDto extends createZodDto(userDetailSchema) {}
