import { Module } from '@nestjs/common';
import { AIOrchestratorService } from './services/ai-orchestrator.service';
import { EmbeddingService } from './services/embedding.service';

@Module({
  providers: [AIOrchestratorService, EmbeddingService],
  exports: [AIOrchestratorService, EmbeddingService],
})
export class AIServiceModule {}
