import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { ChatService } from 'src/chat/chat.service';

describe('KafkaService', () => {
  let service: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ChatService,
          useValue: { bulkInsert: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
