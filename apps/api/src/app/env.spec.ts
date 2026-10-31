import { envSchema } from './env';

const devEnv = {
  PORT: '3000',
  SESSION_SECRET: 'dev-only-session-secret-0123456789abcdef',
  REDIS_URL: 'redis://localhost:6379',
};

const issuePaths = (env: object) =>
  envSchema.safeParse(env).error?.issues.map((issue) => issue.path.join('.'));

describe('envSchema', () => {
  it('accepts the dev defaults and types them', () => {
    expect(envSchema.parse(devEnv)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      SESSION_SECRET: devEnv.SESSION_SECRET,
      REDIS_URL: devEnv.REDIS_URL,
    });
  });

  it('names a missing variable', () => {
    expect(issuePaths({ ...devEnv, REDIS_URL: undefined })).toEqual([
      'REDIS_URL',
    ]);
  });

  it.each(['http://localhost:6379', 'localhost:6379'])(
    'rejects %s as REDIS_URL',
    (url) => {
      expect(issuePaths({ ...devEnv, REDIS_URL: url })).toEqual(['REDIS_URL']);
    },
  );

  it('rejects a session secret shorter than 32 characters', () => {
    expect(issuePaths({ ...devEnv, SESSION_SECRET: 'x'.repeat(31) })).toEqual([
      'SESSION_SECRET',
    ]);
  });

  it('rejects the dev-only session secret in production', () => {
    expect(issuePaths({ ...devEnv, NODE_ENV: 'production' })).toEqual([
      'SESSION_SECRET',
    ]);
  });

  it('accepts a real session secret in production', () => {
    const env = {
      ...devEnv,
      NODE_ENV: 'production',
      SESSION_SECRET: '9f3c1e7a5b2d8f4e6a0c3b9d7e1f5a2c',
    };

    expect(envSchema.safeParse(env).success).toBe(true);
  });

  it('accepts a TLS Redis URL', () => {
    expect(
      envSchema.safeParse({ ...devEnv, REDIS_URL: 'rediss://cache:6380' })
        .success,
    ).toBe(true);
  });
});
