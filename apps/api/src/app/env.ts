import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535),
    SESSION_SECRET: z.string().min(32),
    // One URL for now; Sentinel later swaps the shape of this value, not where it comes from.
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  })
  // The committed dev secret starts with this prefix, so it can never sign production sessions.
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      !env.SESSION_SECRET.startsWith('dev-only-'),
    {
      path: ['SESSION_SECRET'],
      message: 'the dev-only secret is not allowed in production',
    },
  );

export type Env = z.infer<typeof envSchema>;
