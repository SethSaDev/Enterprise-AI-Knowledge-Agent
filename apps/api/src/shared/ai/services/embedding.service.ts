import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  async embed(text: string): Promise<number[]> {
    this.logger.log(`Embedding text of length ${text.length}`);
    // Return mock embedding vector (1536 dimensions for OpenAI)
    return Array(1536).fill(0).map(() => Math.random());
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }
}
