import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ChatDto } from 'src/dto/chat.dto';
import { KafkaService } from 'src/kafka/kafka.service';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token) throw new Error('No token');

      const decoded: any = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = String(decoded.id);

      client.data.user = decoded;
      client.data.userId = userId;

      client.join(userId);

      console.log(
        `user ${userId} joined room ${userId} with socket ${client.id}`,
      );
    } catch (error) {
      console.log('error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = String(client.data.userId || '');
    if (userId) {
      console.log(`user ${userId} disconnected socket ${client.id}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatDto,
  ) {
    try {
      const senderId = String(client.data.userId || '');
      if (!senderId) {
        return { status: 'error', message: 'Unauthorized' };
      }

      let parsedPayload: any = payload;
      if (typeof parsedPayload === 'string') {
        parsedPayload = JSON.parse(parsedPayload);
      }
      if (Array.isArray(parsedPayload) && parsedPayload.length > 0) {
        parsedPayload = parsedPayload[0];
      }

      const receiverId = parsedPayload?.receiverId
        ? String(parsedPayload.receiverId)
        : null;
      const message = parsedPayload?.message || '';
      if (!receiverId || !message) {
        return { status: 'error', message: 'receiverId and message are required' };
      }

      const data = {
        senderId,
        receiverId,
        message,
        sendingIp: this.getClientIp(client),
      };

      if (receiverId) {
        this.server.to(receiverId).emit('receive_message', data);
      }

      await this.kafkaService.sendMessage(data);

      return { status: 'sent' };
    } catch (error) {
      console.log('error', error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }

  private getClientIp(client: Socket) {
    const forwardedFor = client.handshake.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return client.handshake.address || 'unknown';
  }
}
