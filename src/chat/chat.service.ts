import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chats } from 'src/schemas/chats.schema';
import { ChatMessagePayload } from './types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chats.name)
    private readonly chatModel: Model<Chats>,
  ) {}

  async bulkInsert(messages: ChatMessagePayload[]) {
    if (!messages.length) {
      return;
    }

    await this.chatModel.insertMany(messages, { ordered: false });
    this.logger.log(`Inserted ${messages.length} chat messages`);
  }
}
