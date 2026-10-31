import { Injectable } from '@nestjs/common';
import { type Role, type Session, sessionSchema } from '@ratewatch/contracts';
import { randomBytes } from 'node:crypto';
import { sessionTtlMs } from '../constants/session.constants';

@Injectable()
export class AuthService {
  /** A User gets a new random user ID every time; there are no accounts to look up. */
  createSession(role: Role): Session {
    return {
      userId:
        role === 'admin' ? 'admin' : `user-${randomBytes(4).toString('hex')}`,
      role,
      expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
    };
  }

  /**
   * The session in a signed cookie value, or `undefined` if it's missing, expired or doesn't parse.
   * cookie-parser has already checked the signature: a tampered cookie arrives as `false`.
   */
  readSession(cookie: unknown): Session | undefined {
    const parsed = sessionSchema.safeParse(cookie);
    if (!parsed.success || Date.parse(parsed.data.expiresAt) <= Date.now())
      return undefined;
    return parsed.data;
  }
}
