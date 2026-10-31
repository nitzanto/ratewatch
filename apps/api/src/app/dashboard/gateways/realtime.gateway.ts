import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  type RateLimitExceededEvent,
  type RateSubscribeAck,
  rateSubscribeSchema,
  type RateUpdateEvent,
  realtimeEvents,
  type UserRow,
} from '@ratewatch/contracts';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import type { Server, Socket } from 'socket.io';
import { sessionCookie } from '../../auth/constants/session.constants';
import { AuthService } from '../../auth/services/auth.service';
import type { Env } from '../../env';
import { adminsRoom, userRoom } from '../constants/dashboard.constants';
import { UsersService } from '../services/users.service';

/**
 * Admins' live connection, on `/socket.io` beside the API. Only the Admin gets through the handshake. Each admin
 * follows the users on their screen (`rate:subscribe`), so events scale with what admins look at, not with users.
 */
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() private readonly server!: Server;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly authService: AuthService,
    private readonly users: UsersService,
  ) {}

  /** Reads the signed session cookie from the handshake as `main.ts`'s cookie-parser does for HTTP. */
  afterInit(server: Server) {
    const parseCookies = cookieParser(
      this.config.get('SESSION_SECRET', { infer: true }),
    );
    server.use((socket, next) => {
      const request = socket.request as Request;
      parseCookies(request, {} as Response, () => {
        const session = this.authService.readSession(
          request.signedCookies[sessionCookie],
        );
        if (session?.role !== 'admin') return next(new Error('Admins only'));
        socket.data.expiresAt = Date.parse(session.expiresAt);
        next();
      });
    });
  }

  /** Joins the admins' room, and ends the connection when the session it was opened with does, like the cookie. */
  handleConnection(socket: Socket) {
    void socket.join(adminsRoom);
    const timer = setTimeout(
      () => socket.disconnect(true),
      (socket.data.expiresAt as number) - Date.now(),
    );
    socket.on('disconnect', () => clearTimeout(timer));
  }

  /**
   * Replaces the users this admin follows, and answers their current rows. Validated here: Nest's global pipes and
   * guards don't run for gateways.
   */
  @SubscribeMessage(realtimeEvents.subscribe)
  async subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<RateSubscribeAck> {
    const parsed = rateSubscribeSchema.safeParse(body);
    if (!parsed.success) throw new WsException(parsed.error.message);
    const rooms = parsed.data.userIds.map(userRoom);
    for (const room of socket.rooms)
      if (room.startsWith(userRoom('')) && !rooms.includes(room))
        await socket.leave(room);
    await socket.join(rooms);
    // Without Redis there are no rows to send, but the rooms are joined, so updates follow once it's back.
    return {
      rows: await this.users.rows(parsed.data.userIds).catch(() => []),
    };
  }

  /**
   * Not volatile: a second's updates go out back to back, and Socket.IO drops a volatile packet while the one before
   * it is still being written, so an admin would get one followed user's update and lose the rest. At most one per
   * followed user per second, so a slow admin's backlog stays small.
   */
  sendUpdate(event: RateUpdateEvent) {
    this.server
      .to(userRoom(event.row.userId))
      .emit(realtimeEvents.update, event);
  }

  /** An admin's change to a user, sent at once rather than with the next second's updates. */
  sendChange(row: UserRow) {
    this.server.to(userRoom(row.userId)).emit(realtimeEvents.update, {
      row,
      requests: [],
      byAdmin: true,
    } satisfies RateUpdateEvent);
  }

  sendLimitExceeded(event: RateLimitExceededEvent) {
    this.server.to(adminsRoom).emit(realtimeEvents.limitExceeded, event);
  }
}
