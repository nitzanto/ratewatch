import type { INestApplication, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Role } from '@ratewatch/contracts';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { Env } from './env';

/** Starts the whole API on a free port with `main.ts`'s setup (keep the two in step), plus any test-only controllers. */
export const startApp = async (controllers: Type[] = []) => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers,
  }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(
    cookieParser(
      app.get(ConfigService<Env, true>).get('SESSION_SECRET', { infer: true }),
    ),
  );
  await app.listen(0);
  return { app, baseUrl: `${await app.getUrl()}/api` };
};

/** Signs in through the real endpoint. `role` is a string so tests can send invalid ones. */
export const signIn = (baseUrl: string, role: Role | string | undefined) =>
  fetch(`${baseUrl}/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

/** The `name=value` part of the session cookie a response set, as a browser would send it back. */
export const cookieOf = (res: Response) =>
  res.headers.getSetCookie()[0].split(';')[0];
