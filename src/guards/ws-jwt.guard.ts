import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1] ||
      client.handshake.query?.token;

    if (!token) {
      throw new UnauthorizedException('No token');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');

      const decoded: any = this.jwtService.verify(token, { secret });

      client.data.user = decoded;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}