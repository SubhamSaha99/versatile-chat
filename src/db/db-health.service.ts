import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DbHealthService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DbHealthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

 /**
  * * Startup with retry
  */
  async onApplicationBootstrap() {
    const maxRetries = 5;
    const delay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.connection.readyState !== 1 || !this.connection.db) {
          throw new Error('MongoDB not connected yet');
        }

        await this.connection.db.admin().ping();

        this.logger.log(`✅ MongoDB connected (attempt ${attempt})`);
        return;
      } catch (error: unknown) {
        const err =
          error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `⚠️ MongoDB connection failed (attempt ${attempt}/${maxRetries})`,
        );
        this.logger.error(err.message);

        if (attempt === maxRetries) {
          this.logger.error('❌ All retry attempts failed. Exiting...');
          process.exit(1);
        }

        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  /**
   * * Gracefull Shutdown
   * @param signal 
   */
  async onApplicationShutdown(signal?: string) {
    try {
      this.logger.log(`🛑 Shutdown signal received: ${signal}`);

      if (this.connection.readyState === 1) {
        await this.connection.close();
        this.logger.log('✅ MongoDB connection closed successfully');
      } else {
        this.logger.warn('⚠️ MongoDB connection already closed');
      }
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error));

      this.logger.error('❌ Error during MongoDB shutdown', err.stack);
    }
  }
}