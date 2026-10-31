import type { Role, Session } from '@ratewatch/contracts';

const dayMs = 24 * 60 * 60 * 1000;

export const session = (role: Role) =>
  ({
    userId: role === 'admin' ? 'admin' : 'user-7f3a9c2e',
    role,
    expiresAt: new Date(Date.now() + dayMs).toISOString(),
  }) satisfies Session;
