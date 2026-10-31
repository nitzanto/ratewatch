import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@ratewatch/contracts';
import type { CookieOptions, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Env } from '../../env';
import { sessionCookie, sessionTtlMs } from '../constants/session.constants';
import { CurrentSession } from '../decorators/current-session.decorator';
import { Public } from '../decorators/public.decorator';
import { SessionDto } from '../dto/session.dto';
import { SignInRequestDto } from '../dto/sign-in-request.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  // Strict same-site keeps the cookie off cross-site requests; nginx and Vite serve the API on the page's origin.
  private readonly cookieOptions: CookieOptions;

  constructor(
    config: ConfigService<Env, true>,
    private readonly authService: AuthService,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
    };
  }

  @Public()
  @Post('sign-in')
  @ZodSerializerDto(SessionDto)
  signIn(
    @Body() { role }: SignInRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Session {
    const session = this.authService.createSession(role);
    res.cookie(sessionCookie, session, {
      ...this.cookieOptions,
      signed: true,
      maxAge: sessionTtlMs,
    });
    return session;
  }

  @Public()
  @Post('sign-out')
  @HttpCode(204)
  signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(sessionCookie, this.cookieOptions);
  }

  /** Who is signed in, so the web app can restore the session on load. */
  @Get('me')
  @ZodSerializerDto(SessionDto)
  me(@CurrentSession() session: Session): Session {
    return session;
  }
}
