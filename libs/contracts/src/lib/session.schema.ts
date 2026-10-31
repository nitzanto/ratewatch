import { z } from 'zod';

export const roleSchema = z.enum(['user', 'admin']);

export type Role = z.infer<typeof roleSchema>;

/** Who is signed in: the body of `POST /auth/sign-in` and `GET /auth/me`. */
export const sessionSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
  /** ISO 8601 time the session ends; the person must sign in again after it. */
  expiresAt: z.iso.datetime(),
});

export type Session = z.infer<typeof sessionSchema>;

/** Body of `POST /auth/sign-in`. Strict, so a client can never choose its own user ID. */
export const signInRequestSchema = z.strictObject({ role: roleSchema });

export type SignInRequest = z.infer<typeof signInRequestSchema>;
