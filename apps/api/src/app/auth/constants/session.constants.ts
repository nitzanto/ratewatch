export const sessionCookie = 'session';

/** Fixed from sign-in, never extended: the cookie can't be revoked server-side, so this caps a stolen one. */
export const sessionTtlMs = 24 * 60 * 60 * 1000;
