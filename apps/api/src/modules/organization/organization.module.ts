import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { QueueModule } from '../../shared/queue/queue.module';

@Module({
  imports: [DatabaseModule, RedisModule, QueueModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}