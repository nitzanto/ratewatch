import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { UserRow } from '@ratewatch/contracts';
import { uncountedLogEveryMs } from '../../rate-limit/constants/rate-limit.constants';
import {
  flushEveryMs,
  maxPendingUsers,
  maxRequestsPerUpdate,
} from '../constants/dashboard.constants';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import type { Decision } from '../interfaces/decision.interface';
import { UsersService } from './users.service';

/** A request as `rate:update` sends it. */
type PendingRequest = { at: number; allowed: boolean };

/** A user's latest decision and their requests since the last update, newest first. */
type Pending = { latest: Decision; requests: PendingRequest[] };

/**
 * Collects the limiter's decisions in memory, so the request path does no I/O, and once a second writes each
 * changed user's record in one pipeline, then sends each one's `rate:update` with the row as written. A first
 * refusal is sent to admins at once. While Redis is down it keeps the latest numbers (the oldest users go
 * first past `maxPendingUsers`) and writes them once Redis is back.
 */
@Injectable()
export class DashboardPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DashboardPublisher.name);
  // In order of last change, oldest first, so the oldest are the ones dropped.
  private pending = new Map<string, Pending>();
  private timer?: NodeJS.Timeout;
  private lastLoggedAt = -Infinity;

  constructor(
    private readonly users: UsersService,
    private readonly gateway: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.timer = setInterval(
      () => void this.flush().catch((error) => this.logFailure(error)),
      flushEveryMs,
    );
  }

  /**
   * After the HTTP server has closed, so no request is still being recorded: writes the last decisions, so a
   * deploy doesn't lose them, then closes the dashboard's connection. The shared Redis client closes after this.
   */
  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.flush().catch((error) => this.logFailure(error));
    await this.users.close();
  }

  record(decision: Decision) {
    const older = this.pending.get(decision.userId);
    this.pending.delete(decision.userId);
    this.pending.set(decision.userId, {
      latest: decision,
      requests: [
        { at: decision.at, allowed: decision.allowed },
        ...(older?.requests ?? []),
      ].slice(0, maxRequestsPerUpdate),
    });
    this.dropOldest();
    if (decision.firstRefusal)
      this.gateway.sendLimitExceeded({
        userId: decision.userId,
        limit: decision.limit,
        resetAt: new Date(decision.resetAt).toISOString(),
        at: new Date(decision.at).toISOString(),
      });
  }

  private async flush() {
    if (!this.pending.size) return;
    const batch = [...this.pending.values()];
    this.pending = new Map();
    let results: (Error | UserRow)[];
    try {
      results = await this.users.record(batch.map(({ latest }) => latest));
    } catch (error) {
      results = batch.map(() =>
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    // shortcut: every changed user's update is published, though only followed rooms have listeners (the sharded
    // adapter publishes to empty rooms too), so Redis pub/sub grows with active users; #41 measures it, and the fix is
    // to publish only for users some admin follows.
    results.forEach((result, i) => {
      if (result instanceof Error) this.restore(batch[i], result);
      else
        this.gateway.sendUpdate({
          row: result,
          requests: batch[i].requests.map(({ at, allowed }) => ({
            at: new Date(at).toISOString(),
            allowed,
          })),
        });
    });
  }

  /** Puts a batch entry that failed back, behind anything newer recorded since. */
  private restore(entry: Pending, error: Error) {
    const { userId } = entry.latest;
    const newer = this.pending.get(userId);
    if (newer)
      newer.requests = [...newer.requests, ...entry.requests].slice(
        0,
        maxRequestsPerUpdate,
      );
    else this.pending.set(userId, entry);
    this.dropOldest();
    this.logFailure(error);
  }

  private dropOldest() {
    while (this.pending.size > maxPendingUsers)
      this.pending.delete(this.pending.keys().next().value as string);
  }

  /** At most once per interval, like the limiter's own failure log, so an outage can't flood the logs. */
  private logFailure(error: unknown) {
    const now = Date.now();
    if (now - this.lastLoggedAt < uncountedLogEveryMs) return;
    this.logger.error(
      `Dashboard records not written, keeping them for the next try (${error instanceof Error ? error.message : String(error)})`,
    );
    this.lastLoggedAt = now;
  }
}
