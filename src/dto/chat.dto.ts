import { IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  receiverId!: string;

  @IsString()
  message!: string;
}
