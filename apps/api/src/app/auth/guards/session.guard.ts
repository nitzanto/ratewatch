import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sessionCookie } from '../constants/session.constants';
import { isPublicKey } from '../decorators/public.decorator';
import type { SessionRequest } from '../interfaces/session-request.interface';
import { AuthService } from '../services/auth.service';

/** Global: every route answers 401 without a valid session unless it's marked `@Public()`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(isPublicKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const session = this.authService.readSession(
      request.signedCookies[sessionCookie],
    );
    if (!session) throw new UnauthorizedException();
    request.session = session;
    return true;
  }
}
