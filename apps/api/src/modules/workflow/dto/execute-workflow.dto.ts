export class ExecuteWorkflowDto {
  input: Record<string, any>;
  triggerType?: 'manual' | 'api' | 'webhook' | 'scheduled';
}
