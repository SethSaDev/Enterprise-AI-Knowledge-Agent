import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { AIServiceModule } from '../../shared/ai/ai-service.module';

@Module({
  imports: [DatabaseModule, RedisModule, QueueModule, AIServiceModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}