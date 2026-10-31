import type { Session } from '@ratewatch/contracts';
import type { Request } from 'express';

/** The request after `SessionGuard`: every guarded handler and interceptor reads the signed-in person here. */
export interface SessionRequest extends Request {
  session: Session;
}
