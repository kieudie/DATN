import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DataSource } from "typeorm";
import { LoggerService } from "../../common/logger/logger.service";
import { Notification } from "../../entities/notification";
import { RoleType } from "../../security";
import { SocketAuthService } from "./socket-auth.service";

type NotifyPayload = {
  title: string;
  message: string;
  at: string;
};

@WebSocketGateway({
  namespace: "/socket",
  cors: { origin: "*" },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuth: SocketAuthService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new LoggerService("SocketGateway");

  /**
   * Sanitize a string for use in a room name segment.
   * e.g. "Unity Developer" -> "unity_developer"
   */
  static buildManagerRoom(department: string, specialization: string): string {
    const sanitize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[\s/\\]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

    return `recruitment_manager_${sanitize(department)}_${sanitize(
      specialization,
    )}`;
  }

  afterInit() {
    this.logger.log("SocketGateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(
        `[CONNECT] socketId=${client.id} | transport=${client.conn.transport.name} | ip=${client.handshake.address}`,
      );

      client.conn.on("close", (reason: string, description?: any) => {
        this.logger.warn(
          `[TRANSPORT_CLOSED] socketId=${client.id} | userId=${
            client.data?.userId ?? "unknown"
          } | reason=${reason}${
            description ? ` | description=${JSON.stringify(description)}` : ""
          }`,
        );
      });

      const token = this.socketAuth.extractTokenFromHandshake(client.handshake);

      if (!token) {
        this.logger.warn(
          `[AUTH_FAIL] socketId=${client.id} | reason=no_token -> disconnecting`,
        );
        return client.disconnect(true);
      }

      this.logger.log(
        `[AUTH] socketId=${client.id} | token=${token.substring(0, 20)}...`,
      );

      const identity = await this.socketAuth.identify(token);

      client.data.userId = identity.personnel_code;
      client.data.roles = identity.roles;

      this.logger.log(
        `[IDENTIFY] socketId=${client.id} | userId=${
          identity.personnel_code
        } | roles=[${identity.roles.join(", ")}]`,
      );

      const joinedRooms: string[] = [];

      for (const role of identity.roles) {
        if (role === RoleType.RECRUITMENT_MANAGER) {
          try {
            const managerRows: {
              department_name: string;
              specialization: string;
            }[] = await this.dataSource.query(
              `SELECT department_name, specialization
               FROM recruitment_manager
               WHERE id = ? LIMIT 1`,
              [identity.personnel_code],
            );

            if (managerRows.length) {
              const manager = managerRows[0];

              const depts = (manager.department_name || "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);

              const specs = (manager.specialization || "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);

              for (const dept of depts) {
                for (const spec of specs) {
                  const roomName = SocketGateway.buildManagerRoom(dept, spec);
                  await client.join(roomName);
                  joinedRooms.push(roomName);
                }
              }
            }
          } catch (e) {
            this.logger.warn(
              `[JOIN_ROOMS] failed to build manager-specific rooms for userId=${identity.personnel_code}: ${e?.message}`,
            );
          }
        } else {
          const roomName = `recruitment_${role}`;
          await client.join(roomName);
          joinedRooms.push(roomName);
        }
      }

      this.logger.log(
        `[JOIN_ROOMS] socketId=${client.id} | userId=${
          identity.personnel_code
        } | rooms=[${joinedRooms.join(", ")}]`,
      );

      this.debugSnapshot();

      client.emit("notification", {
        title: "Connected",
        message: `socketId=${client.id} | roles=${identity.roles.join(", ")}`,
        at: new Date().toISOString(),
      });

      this.logger.log(
        `[EMIT] socketId=${client.id} | event=notification | title=Connected`,
      );
    } catch (err) {
      this.logger.error(
        `[CONNECT_ERROR] socketId=${client.id} | error=${err?.message ?? err}`,
      );
      return client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[DISCONNECT] socketId=${client.id} | userId=${
        client.data?.userId ?? "unknown"
      } | rooms=[${Array.from(client.rooms ?? []).join(", ") || "(none)"}]`,
    );
  }

  @SubscribeMessage("notify-me")
  onNotifyMe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body?: { message?: string },
  ) {
    this.logger.log(
      `[RECV] socketId=${client.id} | userId=${
        client.data?.userId
      } | event=notify-me | body=${JSON.stringify(body ?? {})}`,
    );

    client.emit("notification", <NotifyPayload>{
      title: "From server",
      message: body?.message ?? "Ping from server",
      at: new Date().toISOString(),
    });

    this.logger.log(
      `[EMIT] socketId=${client.id} | event=notification | title=From server`,
    );
  }

  @SubscribeMessage("join-room")
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { room: string },
  ) {
    const room = String(body?.room || "").trim();
    if (!room) return;

    this.logger.log(
      `[RECV] socketId=${client.id} | userId=${client.data?.userId} | event=join-room | room=${room}`,
    );

    await client.join(room);

    const allRooms = Array.from(client.rooms).join(", ");
    this.logger.log(
      `[JOIN_ROOM] socketId=${client.id} | userId=${client.data?.userId} | joined=${room} | allRooms=[${allRooms}]`,
    );

    client.emit("notification", <NotifyPayload>{
      title: "Joined room",
      message: `room=${room} | your rooms: ${allRooms}`,
      at: new Date().toISOString(),
    });
  }

  broadcast(title: string, message: string) {
    const nsp: any = this.server;
    const socketsMap: Map<string, Socket> =
      nsp?.sockets instanceof Map ? nsp.sockets : nsp?.sockets?.sockets;
    const totalClients = socketsMap?.size ?? 0;

    this.logger.log(
      `[BROADCAST] clients=${totalClients} | title="${title}" | message="${message}"`,
    );

    this.server?.emit("notification", <NotifyPayload>{
      title,
      message,
      at: new Date().toISOString(),
    });
  }

  notifyRoom(room: string, title: string, message: string) {
    if (!room) {
      this.logger.warn("[NOTIFY_ROOM] called with empty room name -> skipped");
      return;
    }

    const nsp: any = this.server;
    const roomsMap: Map<string, Set<string>> | undefined = nsp?.adapter?.rooms;
    const socketsMap: Map<string, Socket> =
      nsp?.sockets instanceof Map ? nsp.sockets : nsp?.sockets?.sockets;
    const socketIds = roomsMap?.get(room);
    const clientsInRoom = socketIds?.size ?? 0;

    const memberDetails = socketIds
      ? Array.from(socketIds)
          .map((sid) => {
            const s = socketsMap?.get(sid);
            return `${s?.data?.userId ?? "??"}(${sid})`;
          })
          .join(", ")
      : "(none)";

    this.logger.log(
      `[NOTIFY_ROOM] room="${room}" | clients=${clientsInRoom} | members=[${memberDetails}] | title="${title}" | message="${message}"`,
    );

    this.server?.to(room).emit("notification", <NotifyPayload>{
      title,
      message,
      at: new Date().toISOString(),
    });

    this.logger.log(
      `[NOTIFY_ROOM_DONE] room="${room}" | emitted to ${clientsInRoom} client(s)`,
    );
  }

  /**
   * Notify room (real-time) + save notification to DB for all users with that role.
   * Room name convention: "recruitment_{roleName}" -> query roleName from DB.
   *
   * NOTE:
   * Sprint 3 flow does not use this method.
   * The active manager notification flow uses notifyManagersAndSave().
   */
  async notifyRoomAndSave(room: string, title: string, message: string) {
    this.notifyRoom(room, title, message);

    const rolePrefix = "recruitment_";
    if (!room.startsWith(rolePrefix)) {
      this.logger.warn(
        `[SAVE_NOTI] room="${room}" does not start with "${rolePrefix}" -> skip DB save`,
      );
      return;
    }

    const roleName = room.substring(rolePrefix.length);

    try {
let users: { personnel_code: number }[] = [];

const normalizedRoleName = roleName.toLowerCase();

if (
  normalizedRoleName === RoleType.RECRUITMENT_MANAGER.toLowerCase() ||
  normalizedRoleName === "recruitment_manager"
) {
  users = await this.dataSource.query(
    `SELECT id AS personnel_code
     FROM recruitment_manager`,
  );
} else {
  this.logger.warn(
    `[SAVE_NOTI] role="${roleName}" is not supported in current recruitment DB -> skip DB insert`,
  );
  return;
}

      const now = new Date();
      const notifications = users.map((u) => {
        const noti = new Notification();
        noti.personnelCode = u.personnel_code;
        noti.title = title;
        noti.body = message;
        noti.isSend = 1;
        noti.isRead = 0;
        noti.date = now.toISOString().slice(0, 19).replace("T", " ");
        noti.createdAt = now;
        noti.updatedAt = now;
        return noti;
      });

      await this.dataSource.getRepository(Notification).save(notifications);

      this.logger.log(
        `[SAVE_NOTI] saved ${
          notifications.length
        } notification(s) for role="${roleName}" | personnelCodes=[${users
          .map((u) => u.personnel_code)
          .join(", ")}]`,
      );
    } catch (err) {
      this.logger.error(
        `[SAVE_NOTI_ERROR] room="${room}" | error=${err?.message ?? err}`,
      );
    }
  }

  /**
   * Emit to a set of targeted rooms and persist notifications for the given manager emails.
   * Used when notifications should be scoped to dept x specialization rooms.
   */
  async notifyManagersAndSave(
    rooms: string[],
    title: string,
    message: string,
    managerEmails: string[],
  ): Promise<void> {
    for (const room of rooms) {
      this.notifyRoom(room, title, message);
    }

    if (!managerEmails.length) return;

    try {
      const placeholders = managerEmails.map(() => "?").join(", ");

      const users: { personnel_code: number }[] = await this.dataSource.query(
        `SELECT id AS personnel_code
         FROM recruitment_manager
         WHERE email IN (${placeholders})`,
        managerEmails,
      );

      if (!users.length) {
        this.logger.warn(
          `[SAVE_NOTI] no recruitment managers found for emails=[${managerEmails.join(
            ", ",
          )}]`,
        );
        return;
      }

      const now = new Date();
      const notifications = users.map((u) => {
        const noti = new Notification();
        noti.personnelCode = u.personnel_code;
        noti.title = title;
        noti.body = message;
        noti.isSend = 1;
        noti.isRead = 0;
        noti.date = now.toISOString().slice(0, 19).replace("T", " ");
        noti.createdAt = now;
        noti.updatedAt = now;
        return noti;
      });

      await this.dataSource.getRepository(Notification).save(notifications);

      this.logger.log(
        `[SAVE_NOTI] saved ${
          notifications.length
        } notification(s) for managers emails=[${managerEmails.join(", ")}]`,
      );
    } catch (err) {
      this.logger.error(
        `[SAVE_NOTI_ERROR] emails=[${managerEmails.join(", ")}] | error=${
          err?.message ?? err
        }`,
      );
    }
  }

  debugSnapshot() {
    const nsp: any = this.server;

    const socketsMap: Map<string, Socket> =
      nsp?.sockets instanceof Map ? nsp.sockets : nsp?.sockets?.sockets;

    const roomsMap: Map<string, Set<string>> | undefined = nsp?.adapter?.rooms;

    this.logger.log("===== Socket Debug Snapshot =====");
    this.logger.log(`Total connected sockets: ${socketsMap?.size ?? 0}`);
    this.logger.log(`Total rooms (raw): ${roomsMap?.size ?? 0}`);

    if (!socketsMap || !roomsMap) {
      this.logger.log("adapter/socketsMap not ready");
      this.logger.log("=================================");
      return;
    }

    const publicRooms = Array.from(roomsMap.entries()).filter(
      ([roomName, socketSet]) => !socketSet.has(roomName),
    );

    this.logger.log(`Total rooms (public): ${publicRooms.length}`);

    for (const [roomName, socketIds] of publicRooms) {
      const members = Array.from(socketIds).map((sid) => {
        const s = socketsMap.get(sid);
        const personnelCode =
          s?.data?.userId ?? s?.data?.personnel_code ?? "unknown";
        return { sid, personnelCode };
      });

      this.logger.log(
        `[room] ${roomName} | members=${members.length} | ` +
          members.map((m) => `${m.personnelCode}(${m.sid})`).join(", "),
      );
    }

    this.logger.log("=================================");
  }
}