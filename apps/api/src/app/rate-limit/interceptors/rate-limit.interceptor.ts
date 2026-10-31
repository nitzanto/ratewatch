import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  defaultHourlyLimit,
  type RateLimitedResponse,
  requestsLeftHeader,
} from '@ratewatch/contracts';
import type { Response } from 'express';
import type Redis from 'ioredis';
import { isPublicKey } from '../../auth/decorators/public.decorator';
import type { SessionRequest } from '../../auth/interfaces/session-request.interface';
import { redisClient } from '../../redis/constants/redis.constants';
import {
  uncountedLogEveryMs,
  rateLimitKeys,
  rateLimitScript,
  windowMs,
} from '../constants/rate-limit.constants';

/** `[allowed, requestsLeft, msUntilReset, limit, count, firstRefusal]`, see `rateLimitScript`. */
type RateLimitReply = [number, number, number, number, number, number];

type RateLimitRedis = Redis & {
  rateLimit(
    window: string,
    limit: string,
    pause: string,
    defaultLimit: number,
    windowMs: number,
  ): Promise<RateLimitReply>;
};

/**
 * Global: counts every request a User makes against their limit, and reports the requests left in `x-count`.
 * Runs after `SessionGuard`, so the session is known; public routes and the Admin are never counted.
 * Fails open: when Redis can't answer, the request goes through uncounted and without `x-count`.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly redis: RateLimitRedis;
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private lastLoggedAt = -Infinity;

  constructor(
    private readonly reflector: Reflector,
    @Inject(redisClient) redis: Redis,
  ) {
    // Runs as EVALSHA, and ioredis resends the script when Redis has lost its script cache.
    redis.defineCommand('rateLimit', { numberOfKeys: 3, lua: rateLimitScript });
    this.redis = redis as RateLimitRedis;
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const isPublic = this.reflector.getAllAndOverride<boolean>(isPublicKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    const { session } = context.switchToHttp().getRequest<SessionRequest>();
    if (isPublic || session.role === 'admin') return next.handle();

    let reply: RateLimitReply;
    try {
      reply = await this.redis.rateLimit(
        ...rateLimitKeys(session.userId),
        defaultHourlyLimit,
        windowMs,
      );
    } catch (error) {
      this.failOpen(error);
      return next.handle();
    }
    const [allowed, requestsLeft, msUntilReset] = reply;
    const response = context.switchToHttp().getResponse<Response>();

    if (!allowed) {
      response.setHeader('Retry-After', Math.ceil(msUntilReset / 1000));
      throw new HttpException(
        {
          message: "You've used all your requests for this hour.",
          retryAt: new Date(Date.now() + msUntilReset).toISOString(),
        } satisfies RateLimitedResponse,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    response.setHeader(requestsLeftHeader, requestsLeft);
    return next.handle();
  }

  /**
   * Logs at most once per interval, so an outage can't flood the logs. How many requests went through
   * uncounted is for the failed-open metric (#36), not the log.
   */
  private failOpen(error: unknown) {
    const now = Date.now();
    if (now - this.lastLoggedAt < uncountedLogEveryMs) return;
    this.logger.error(
      `Rate limit unavailable, letting requests through uncounted (${error instanceof Error ? error.message : String(error)})`,
      error instanceof Error ? error.stack : undefined,
    );
    this.lastLoggedAt = now;
  }
}
