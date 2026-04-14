import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception-filter';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { getRedisUrl } from './redis/redis.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisAdapter = new RedisIoAdapter(app);
  const socketRedisEnabled =
    (process.env.SOCKET_IO_REDIS_ENABLED ?? 'true') === 'true';

  if (socketRedisEnabled) {
    await redisAdapter.connectToRedis(getRedisUrl());
    app.useWebSocketAdapter(redisAdapter);
  }

  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET ?? 'default-csrf-secret',
    getSessionIdentifier: (req) => (req as any).ip ?? (req as any).socket?.remoteAddress ?? ''
  });
  app.use(doubleCsrfProtection);
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
  console.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
