import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export type SocketIdentity = {
  roles: string[];
  personnel_code: string;
};

@Injectable()
export class SocketAuthService {
  constructor(private readonly jwt: JwtService) {}

  extractTokenFromHandshake(handshake: any): string | null {
    const t1 = handshake?.auth?.token;

    if (t1) return String(t1);

    // fallback header Authorization
    const auth = handshake?.headers?.authorization;
    if (!auth) return null;
    const s = Array.isArray(auth) ? auth[0] : auth;
    const m = String(s).match(/^Bearer\s+(.+)$/i);
    return m?.[1] ?? null;
  }

  async identify(token: string): Promise<SocketIdentity> {
    const payload: any = this.jwt.verify(token, {
      ignoreExpiration: true,
    });

    const { roles, personnel_code } = payload;

    return { roles, personnel_code };
  }
}
