import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { SocketGateway } from "./socket.gateway";

@Controller("socket")
export class SocketController {
  constructor(private readonly gateway: SocketGateway) {}

  @Post("notify")
  notify(@Body() body: { title?: string; message?: string }) {
    const title = body?.title || "Test notification";
    const message = body?.message || "Test socket notification";

    this.gateway.broadcast(title, message);

    return { ok: true };
  }

  @Post("notify-room")
  async notifyRoom(
    @Body()
    body: {
      room?: string;
      title?: string;
      message?: string;
    },
  ) {
    const room = body?.room?.trim();

    if (!room) {
      throw new BadRequestException("room is required");
    }

    const title = body?.title || "Test notify room";
    const message = body?.message || "Test save notification for room";

    await this.gateway.notifyRoomAndSave(room, title, message);

    return { ok: true };
  }

  @Get("debug")
  debug() {
    this.gateway.debugSnapshot();

    return { ok: true };
  }
}