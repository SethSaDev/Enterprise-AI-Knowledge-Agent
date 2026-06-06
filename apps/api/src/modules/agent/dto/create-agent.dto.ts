export class CreateAgentDto {
  name: string;
  description?: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  modelConfig?: Record<string, any>;
  tools?: any[];
  memoryConfig?: Record<string, any>;
}
