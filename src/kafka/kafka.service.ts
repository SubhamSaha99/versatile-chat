import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Partitioners } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { ChatService } from 'src/chat/chat.service';
import { ChatMessagePayload } from 'src/chat/types';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly producer: ReturnType<Kafka['producer']>;
  private readonly consumer: ReturnType<Kafka['consumer']>;
  private readonly topic: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private buffer: ChatMessagePayload[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {
    const env = configService.get<string>('DEV_ENV') || 'local';
    const kafkaBroker =
      env === 'container'
        ? configService.get<string>('KAFKA_BROKER_URL_CONTAINER')
        : configService.get<string>('KAFKA_BROKER_URL_LOCAL');
    this.kafka = new Kafka({
      brokers: [kafkaBroker || 'localhost:29092'],
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    this.consumer = this.kafka.consumer({
      groupId:
        this.configService.get<string>('KAFKA_CONSUMER_ID') ||
        'chat_service_group',
    });
    this.topic =
      this.configService.get<string>('KAFKA_TOPIC') || 'chat_messages';
    this.flushIntervalMs = Number(
      this.configService.get<string>('KAFKA_FLUSH_INTERVAL_MS') || 5000,
    );
    this.maxBatchSize = Number(
      this.configService.get<string>('KAFKA_BATCH_SIZE') || 20,
    );
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.startConsumer();
    this.startFlushTimer();
  }

  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flushBuffer();
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }

  async sendMessage(message: ChatMessagePayload) {
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async startConsumer() {
    await this.consumer.connect();

    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        const data = JSON.parse(message.value.toString()) as ChatMessagePayload;
        this.buffer.push(data);

        if (this.buffer.length >= this.maxBatchSize) {
          await this.flushBuffer();
        }
      },
    });
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      void this.flushBuffer();
    }, this.flushIntervalMs);
  }

  async flushBuffer() {
    if (!this.buffer.length || this.isFlushing) return;

    this.isFlushing = true;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.chatService.bulkInsert(batch);
    } catch (error) {
      this.buffer = [...batch, ...this.buffer];
      this.logger.error('Failed to flush Kafka message buffer', error);
      throw error;
    } finally {
      this.isFlushing = false;
    }
  }
}
