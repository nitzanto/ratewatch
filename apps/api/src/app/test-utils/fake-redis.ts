import { createServer, type Server } from 'node:net';
import { createRedisClient } from '../redis/providers/redis-client.provider';

/** A client with the API's real options, pointed where nothing listens, so every command fails as with Redis down. */
export const unreachableRedis = () => createRedisClient('redis://127.0.0.1:1');

/**
 * A stand-in Redis for failure tests: it answers ioredis's startup commands (`CLIENT SETINFO`, `INFO`), and
 * `PING` when `answersPing`, but never replies to anything else, like a Redis that hangs.
 */
export const startFakeRedis = ({
  port = 0,
  answersPing = false,
}: { port?: number; answersPing?: boolean } = {}) =>
  new Promise<{ server: Server; port: number; url: string }>(
    (resolve, reject) => {
      const server = createServer((socket) =>
        socket.on('data', (data) => {
          const text = data.toString();
          socket.write('+OK\r\n'.repeat(text.split('SETINFO').length - 1));
          if (text.includes('$4\r\ninfo\r\n')) {
            const info = 'loading:0\r\n';
            socket.write(`$${info.length}\r\n${info}\r\n`);
          }
          if (answersPing && text.includes('$4\r\nping\r\n'))
            socket.write('+PONG\r\n');
        }),
      );
      server.on('error', reject);
      server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('the fake Redis is not listening on a TCP port'));
          return;
        }
        resolve({
          server,
          port: address.port,
          url: `redis://127.0.0.1:${address.port}`,
        });
      });
    },
  );
