import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UsersDocument = HydratedDocument<Users>;

@Schema({ timestamps: true, versionKey: false })
export class Users {
  @Prop({ required: true, trim: true, type: String })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, type: String })
  email!: string;

  @Prop({ required: true, type: String })
  password!: string;

  @Prop({ default: true, type: Boolean })
  isActive!: boolean;

  @Prop({ default: null, type: Date })
  lastLogin?: Date | null;

  @Prop({ default: null, type: String })
  lastLoginIP?: string | null;
}

export const UsersSchema = SchemaFactory.createForClass(Users);
