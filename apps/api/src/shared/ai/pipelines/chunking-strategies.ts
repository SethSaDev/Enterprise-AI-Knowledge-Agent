export interface ChunkingStrategy {
  chunk(text: string, chunkSize: number, overlap: number): string[];
}

export class SemanticChunkingStrategy implements ChunkingStrategy {
  chunk(text: string, chunkSize: number, overlap: number): string[] {
    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Keep overlap by taking last N characters
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}

export class FixedSizeChunkingStrategy implements ChunkingStrategy {
  chunk(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }
}

export class ParagraphChunkingStrategy implements ChunkingStrategy {
  chunk(text: string, chunkSize: number, overlap: number): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}
