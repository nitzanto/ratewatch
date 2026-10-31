import { Logger } from '@nestjs/common';
import { startFakeRedis } from '../../test-utils/fake-redis';
import { createRedisClient } from './redis-client.provider';

describe('createRedisClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs once when Redis goes down and once when it is back, not on every reconnect attempt', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const logInfo = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    // Reserve a free port, then free it: Redis is "down" until a fake starts listening there.
    const { server: probe, port, url } = await startFakeRedis();
    await new Promise((resolve) => probe.close(resolve));
    const redis = createRedisClient(url);

    // Several reconnect attempts fail first (ioredis backs off 50 ms, 100 ms, 150 ms…).
    await new Promise((resolve) => setTimeout(resolve, 400));
    const { server } = await startFakeRedis({ port });
    await vi.waitFor(
      () => expect(logInfo).toHaveBeenCalledWith('Redis is back'),
      {
        timeout: 5_000,
      },
    );
    redis.disconnect();
    server.close();

    expect(logError).toHaveBeenCalledOnce();
    expect(logError.mock.calls[0][0]).toMatch(/^Redis unavailable/);
  });
});
