import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { ChatModule } from 'src/chat/chat.module';

@Global()
@Module({
  imports: [ChatModule],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
