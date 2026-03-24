import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatDocument = HydratedDocument<Chats>;

@Schema({ timestamps: true, versionKey: false })
export class Chats {
  @Prop({ type: Types.ObjectId, required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  receiverId!: Types.ObjectId;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true })
  sendingIp!: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chats);

ChatSchema.index({ senderId: 1, receiverId: 1 });
ChatSchema.index({ createdAt: -1 });
