import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type AdminChange,
  defaultHourlyLimit,
  maxLimit,
  type Pause,
  pauseMs,
} from '@ratewatch/contracts';
import type Redis from 'ioredis';
import type { ChainableCommander } from 'ioredis';
import { rateLimitKeys } from '../../rate-limit/constants/rate-limit.constants';
import { redisClient } from '../../redis/constants/redis.constants';
import {
  addExtraRequestsScript,
  pauseScript,
  resetLimitScript,
  setLimitScript,
  unlockScript,
} from '../constants/admin-controls.constants';
import { userKey } from '../constants/dashboard.constants';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { toFields, toRow } from './users.service';

/** A change script's reply: the user's record after the change, empty without one. */
type ChangeReply = string[];

/** The single-user change scripts, each run as a command of that name. */
const changeScripts = {
  addExtraRequests: addExtraRequestsScript,
  setLimit: setLimitScript,
  pause: pauseScript,
  unlock: unlockScript,
};

type ChangeCommand = keyof typeof changeScripts;

type ControlsRedis = Redis &
  Record<ChangeCommand, (...args: (string | number)[]) => Promise<unknown>>;

type ControlsPipeline = ChainableCommander & {
  resetLimit(...args: (string | number)[]): ControlsPipeline;
};

/** The four keys a control script takes: the limiter's, then the record. */
const keysOf = (userId: string) => [...rateLimitKeys(userId), userKey(userId)];

/**
 * An admin's changes to users' limits. Each one changes the limiter's keys and the user's record in one script, and
 * sends the new row to the admins following the user. On the shared connection: these are rare, and only an admin
 * waits on them.
 */
@Injectable()
export class AdminControlsService {
  private readonly redis: ControlsRedis;

  constructor(
    @Inject(redisClient) redis: Redis,
    private readonly gateway: RealtimeGateway,
  ) {
    redis.defineCommand('resetLimit', {
      numberOfKeys: 4,
      lua: resetLimitScript,
    });
    for (const [name, lua] of Object.entries(changeScripts))
      redis.defineCommand(name, { numberOfKeys: 4, lua });
    this.redis = redis as ControlsRedis;
  }

  /** Ends these users' windows now, together; a repeated ID counts once. */
  async reset(userIds: string[]): Promise<AdminChange> {
    const pipeline = this.redis.pipeline() as ControlsPipeline;
    const now = Date.now();
    for (const userId of new Set(userIds))
      pipeline.resetLimit(...keysOf(userId), now, defaultHourlyLimit);
    const replies = ((await pipeline.exec()) ?? []).map(([error, reply]) => {
      if (error) throw error;
      return reply as ChangeReply;
    });
    return { rows: this.publish(replies) };
  }

  /** Adds `amount` requests to the user's current window; 409 without one, 422 when the limit would pass 1,000. */
  addExtraRequests(userId: string, amount: number) {
    return this.change('addExtraRequests', userId, amount, maxLimit);
  }

  /** Sets the user's limit in every window; 100 clears their custom limit. 422 when it and the window's extra requests would pass 1,000. */
  setLimit(userId: string, limit: number) {
    return this.change('setLimit', userId, limit, maxLimit);
  }

  /** Pauses the user's limit; 409 to pause until the reset without an open window. */
  pause(userId: string, { duration }: Pause) {
    return this.change(
      'pause',
      userId,
      // The script reads the window's time left itself.
      duration === 'untilReset' ? 'untilReset' : pauseMs[duration],
      Date.now(),
    );
  }

  /** Ends the user's pause now. */
  unlock(userId: string) {
    return this.change('unlock', userId);
  }

  /** Runs one user's change script with `args` then the default limit, and answers its row. */
  private async change(
    command: ChangeCommand,
    userId: string,
    ...args: (string | number)[]
  ): Promise<AdminChange> {
    let reply: ChangeReply;
    try {
      reply = (await this.redis[command](
        ...keysOf(userId),
        ...args,
        defaultHourlyLimit,
      )) as ChangeReply;
    } catch (error) {
      // Redis puts `ERR ` before a script's own error.
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NO_WINDOW'))
        throw new ConflictException(`${userId} has no open window`);
      if (message.includes('OVER_MAX_LIMIT'))
        throw new UnprocessableEntityException(
          `A limit can't go above ${maxLimit}`,
        );
      throw error;
    }
    return { rows: this.publish([reply]) };
  }

  /** The records as rows, each sent to the admins following its user; users without a record have none. */
  private publish(records: ChangeReply[]) {
    const now = Date.now();
    const rows = records
      .filter((record) => record.length)
      .map((record) => toRow(toFields(record), now));
    for (const row of rows) this.gateway.sendChange(row);
    return rows;
  }
}
