export class CreateWorkflowDto {
  name: string;
  description?: string;
  definition: {
    steps: Array<{
      id: string;
      name: string;
      type: 'ai_call' | 'condition' | 'transform' | 'delay' | 'webhook';
      config: Record<string, any>;
      next?: string[];
    }>;
  };
}
