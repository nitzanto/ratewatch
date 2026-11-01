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
import {
  defaultHourlyLimit,
  type RateLimitedResponse,
  requestsLeftHeader,
} from '@ratewatch/contracts';
import type { Response } from 'express';
import type Redis from 'ioredis';
import type { SessionRequest } from '../../auth/interfaces/session-request.interface';
import { DashboardPublisher } from '../../dashboard/services/dashboard-publisher.service';
import { redisClient } from '../../redis/constants/redis.constants';
import {
  burstLimit,
  uncountedLogEveryMs,
  rateLimitKeys,
  rateLimitScript,
  windowMs,
} from '../constants/rate-limit.constants';
import type { BurstLimit } from '../interfaces/burst-limit.interface';

/** `[allowed, requestsLeft, msUntilReset, limit, count, firstRefusal, msUntilToken]`, see `rateLimitScript`. */
type RateLimitReply = [number, number, number, number, number, number, number];

type RateLimitRedis = Redis & {
  rateLimit(
    window: string,
    limit: string,
    pause: string,
    defaultLimit: number,
    windowMs: number,
    now: number,
    capacity: number,
    tokensPerMs: number,
  ): Promise<RateLimitReply>;
};

/**
 * Counts each request to the routes it's applied to (only `POST /clicks`) against the User's limit, and reports
 * the requests left in `x-count`. A request must also pass the burst limit, a token bucket that refuses requests
 * sent faster than a person clicks. Runs after `SessionGuard`, so the session is known; the Admin is never counted.
 * Fails open: when Redis can't answer, the request goes through uncounted and without `x-count`.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly redis: RateLimitRedis;
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private lastLoggedAt = -Infinity;

  constructor(
    @Inject(redisClient) redis: Redis,
    private readonly dashboard: DashboardPublisher,
    @Inject(burstLimit) private readonly burst: BurstLimit,
  ) {
    // Runs as EVALSHA, and ioredis resends the script when Redis has lost its script cache.
    redis.defineCommand('rateLimit', { numberOfKeys: 3, lua: rateLimitScript });
    this.redis = redis as RateLimitRedis;
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const { session } = context.switchToHttp().getRequest<SessionRequest>();
    if (session.role === 'admin') return next.handle();

    const at = Date.now();
    let reply: RateLimitReply;
    try {
      reply = await this.redis.rateLimit(
        ...rateLimitKeys(session.userId),
        defaultHourlyLimit,
        windowMs,
        at,
        this.burst.capacity,
        this.burst.refillPerSecond / 1000,
      );
    } catch (error) {
      this.failOpen(error);
      return next.handle();
    }
    const [
      allowed,
      requestsLeft,
      msUntilReset,
      limit,
      used,
      firstRefusal,
      msUntilToken,
    ] = reply;
    const resetAt = at + msUntilReset;
    // In memory only: the dashboard writes it to Redis with the rest of the second's decisions.
    this.dashboard.record({
      userId: session.userId,
      allowed: allowed === 1,
      at,
      limit,
      used,
      resetAt,
      firstRefusal: firstRefusal === 1,
    });
    const response = context.switchToHttp().getResponse<Response>();

    if (!allowed) {
      const burst = msUntilToken > 0;
      const msUntilRetry = burst ? msUntilToken : msUntilReset;
      response.setHeader('Retry-After', Math.ceil(msUntilRetry / 1000));
      throw new HttpException(
        {
          message: burst
            ? 'Too many requests at once. Slow down a little.'
            : "You've used all your requests for this hour.",
          retryAt: new Date(at + msUntilRetry).toISOString(),
          reason: burst ? 'burst' : 'hourly',
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
