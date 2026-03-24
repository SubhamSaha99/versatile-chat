import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DBConfigModule } from './db/db-config.module';
import { KafkaModule } from './kafka/kafka.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DBConfigModule,
    AuthModule,
    KafkaModule,
    ChatModule,
  ],
})
export class AppModule {}
