import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception-filter';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET ?? 'default-csrf-secret',
    getSessionIdentifier: (req) => (req as any).ip ?? (req as any).socket?.remoteAddress ?? ''
  });
  app.use(doubleCsrfProtection);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
  app.useGlobalPipes(new ValidationPipe());
  console.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
