import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DbHealthService } from './db-health.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const env = configService.get<string>('DEV_ENV') || 'local';

        const uri =
          env === 'container'
            ? configService.get<string>('MONGO_URI_CONTAINER')
            : configService.get<string>('MONGO_URI_LOCAL');

        return {
          uri: uri || 'mongodb://root:root@localhost:27017/',
          dbName: configService.get<string>('DB_NAME') || 'versatile-chat',
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
    }),
  ],
  providers: [DbHealthService],
})
export class DBConfigModule {}