import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@ratewatch/contracts';
import { sessionCookie } from '../constants/session.constants';
import { isPublicKey } from '../decorators/public.decorator';
import { rolesKey } from '../decorators/roles.decorator';
import type { SessionRequest } from '../interfaces/session-request.interface';
import { AuthService } from '../services/auth.service';

/**
 * Global: every route answers 401 without a valid session unless it's marked `@Public()`, and 403 when it's
 * marked `@Roles(...)` and the session's role isn't one of them. Handler roles override controller roles.
 */
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

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      rolesKey,
      [context.getHandler(), context.getClass()],
    );

    if (roles && !roles.includes(session.role)) throw new ForbiddenException();

    request.session = session;
    return true;
  }
}
