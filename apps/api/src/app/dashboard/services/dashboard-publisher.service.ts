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
} from '../constants/dashboard.constants';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import {
  addDecision,
  buildLimitExceededEvent,
  buildUpdateEvent,
  mergeActivities,
} from '../helpers/activity.helpers';
import type { Activity } from '../interfaces/activity.interface';
import type { Decision } from '../interfaces/decision.interface';
import { UsersService } from './users.service';

/**
 * Collects the limiter's decisions in memory, so the request path does no I/O, and once a second writes each
 * changed user's record, history and recent requests in one pipeline, then sends each one's `rate:update` with the row as written,
 * and this instance's admins the summary. A first
 * refusal is sent to admins at once. While Redis is down it keeps the latest numbers (the oldest users go
 * first past `maxPendingUsers`) and writes them once Redis is back.
 */
@Injectable()
export class DashboardPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DashboardPublisher.name);
  // In order of last change, oldest first, so the oldest are the ones dropped.
  private pending = new Map<string, Activity>();
  private timer?: NodeJS.Timeout;
  private lastLoggedAt = -Infinity;

  constructor(
    private readonly users: UsersService,
    private readonly gateway: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.flush()
          .catch((error) => this.logFailure(error))
          .then(() => this.sendSummary()),
      flushEveryMs,
    );
  }

  /** After the second's records are written, so the summary counts them. Skipped while Redis is down, like `rate:update`. */
  private async sendSummary() {
    if (!this.gateway.hasLocalAdmins()) return;

    const summary = await this.users.summary().catch(() => null);

    if (summary) this.gateway.sendSummary(summary);
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

  /**
   * Puts one click's result in the in-memory box, merged with the user's earlier clicks this second, and returns
   * the user's merged activity. No Redis call.
   */
  record(decision: Decision): Activity {
    // Step 1: merge the click into the user's earlier activity.
    const activity = addDecision(this.pending.get(decision.userId), decision);

    // Step 2: put it back at the end, so `dropOldest` drops whoever changed longest ago, and keep the box under
    // its cap.
    this.pending.delete(decision.userId);
    this.pending.set(decision.userId, activity);
    this.dropOldest();

    // Step 3: the one urgent case: admins hear about a first refusal now, not with the next flush.
    if (decision.firstRefusal)
      this.gateway.sendLimitExceeded(buildLimitExceededEvent(decision));

    return activity;
  }

  /** Once a second: empties the box, writes it to Redis in one batch, and sends each new row to the admins watching. */
  private async flush(): Promise<(Error | UserRow)[]> {
    if (!this.pending.size) return [];

    // Step 1: take the box and start a new one, so clicks during the write wait for the next flush.
    const batch = [...this.pending.values()];

    this.pending = new Map();
    let results: (Error | UserRow)[];

    // Step 2: the write to Redis, one pipeline per chunk of users (see `UsersService.record`). If it fails as a
    // whole, every user gets the error.
    try {
      results = await this.users.record(batch);
    } catch (error) {
      results = batch.map(() =>
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // shortcut: every changed user's update is published, though only followed rooms have listeners (the sharded
    // adapter publishes to empty rooms too), so Redis pub/sub grows with active users; #41 measures it, and the fix is
    // to publish only for users some admin follows.
    // Step 3: per user, success sends the row to admins; failure goes back in the box for the next flush.
    for (const [userIndex, activity] of batch.entries()) {
      const result = results[userIndex];

      if (result instanceof Error) this.restore(activity, result);
      else this.gateway.sendUpdate(buildUpdateEvent(result, activity));
    }

    return results;
  }

  /** Puts a batch entry that failed back, behind anything newer recorded since. */
  // shortcut: a batch that timed out after Redis applied it is written again, so its requests count twice in the
  // history, the recent list and the refused-today count; fine for a dashboard, and an idempotent write (a batch ID) fixes it if it matters.
  private restore(entry: Activity, error: Error): Activity {
    const { userId } = entry.latest;
    const newer = this.pending.get(userId);
    // Behind anything newer: an existing user keeps their place in the box.
    const restored = newer ? mergeActivities(newer, entry) : entry;

    this.pending.set(userId, restored);
    this.dropOldest();
    this.logFailure(error);

    return restored;
  }

  /** Caps the box while Redis is down, so it can't grow forever; returns how many users it dropped. */
  private dropOldest(): number {
    let dropped = 0;

    while (this.pending.size > maxPendingUsers) {
      this.pending.delete(this.pending.keys().next().value as string);
      dropped++;
    }

    return dropped;
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
