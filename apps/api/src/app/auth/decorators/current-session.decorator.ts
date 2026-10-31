import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionRequest } from '../interfaces/session-request.interface';

/** Injects the signed-in person's session into a guarded handler. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SessionRequest>().session,
);
