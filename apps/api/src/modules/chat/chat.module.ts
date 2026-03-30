import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { AIServiceModule } from '../../shared/ai/ai-service.module';

@Module({
  imports: [DatabaseModule, RedisModule, QueueModule, AIServiceModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}