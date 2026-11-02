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
    // Step 1: skip what isn't counted: anything but HTTP, and the Admin.
    if (context.getType() !== 'http') return next.handle();

    const { session } = context.switchToHttp().getRequest<SessionRequest>();

    if (session.role === 'admin') return next.handle();

    // Step 2: check and count the request in Redis, in one atomic script. If Redis can't answer, let it through.
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

    // Step 3: read the script's answer.
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

    // Step 4: tell the dashboard. No Redis call: the result waits in memory, and within a second
    // `DashboardPublisher.flush()` writes it to Redis through `UsersService.record()`, in one batch. Why wait: the
    // click stays one Redis call, repeated clicks merge into one write, and many users share one trip to Redis.
    this.dashboard.record({
      userId: session.userId,
      allowed: allowed === 1,
      at,
      limit,
      used,
      resetAt,
      firstRefusal: firstRefusal === 1,
    });

    // Step 5: refused, so a 429 that says which limit refused it and when to try again.
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

    // Step 6: allowed, so send the requests left in `x-count` and go on to the handler.
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
