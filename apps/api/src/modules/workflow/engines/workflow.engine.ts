import { Injectable, Logger } from '@nestjs/common';

export interface Step {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  next?: string[];
}

export interface WorkflowDefinition {
  steps: Step[];
  entryPoint: string;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  async execute(definition: WorkflowDefinition, context: any): Promise<any> {
    this.logger.log(`Executing workflow with ${definition.steps.length} steps`);
    
    let currentStepId = definition.entryPoint;
    const results: Record<string, any> = {};
    
    while (currentStepId) {
      const step = definition.steps.find(s => s.id === currentStepId);
      if (!step) break;
      
      this.logger.log(`Executing step: ${step.name} (${step.type})`);
      
      // Execute step based on type
      const stepResult = await this.executeStep(step, context, results);
      results[step.id] = stepResult;
      
      // Determine next step based on condition or default
      if (step.type === 'condition' && stepResult.condition) {
        currentStepId = stepResult.nextStepId;
      } else if (step.next && step.next.length > 0) {
        currentStepId = step.next[0];
      } else {
        currentStepId = null;
      }
    }
    
    return results;
  }

  private async executeStep(step: Step, context: any, previousResults: any): Promise<any> {
    switch (step.type) {
      case 'ai_call':
        return this.executeAICall(step.config, context);
      case 'condition':
        return this.executeCondition(step.config, previousResults);
      case 'transform':
        return this.executeTransform(step.config, context);
      case 'delay':
        await this.executeDelay(step.config);
        return { status: 'delayed' };
      case 'webhook':
        return this.executeWebhook(step.config, context);
      default:
        return { status: 'completed' };
    }
  }

  private async executeAICall(config: any, context: any): Promise<any> {
    // Mock AI call
    return {
      response: `AI response for prompt: ${config.prompt}`,
      tokens: 100,
    };
  }

  private async executeCondition(config: any, previousResults: any): Promise<any> {
    const condition = config.condition;
    const value = previousResults[config.sourceStepId]?.value;
    
    // Simple condition evaluation
    let conditionMet = false;
    if (condition === 'equals' && value === config.value) conditionMet = true;
    if (condition === 'greaterThan' && value > config.value) conditionMet = true;
    if (condition === 'lessThan' && value < config.value) conditionMet = true;
    
    return {
      condition: conditionMet,
      nextStepId: conditionMet ? config.trueStepId : config.falseStepId,
    };
  }

  private async executeTransform(config: any, context: any): Promise<any> {
    // Apply transformation based on config
    const transformed = { ...context };
    if (config.fields) {
      for (const [key, value] of Object.entries(config.fields)) {
        transformed[key] = value;
      }
    }
    return transformed;
  }

  private async executeDelay(config: any): Promise<void> {
    const duration = config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async executeWebhook(config: any, context: any): Promise<any> {
    // Mock webhook call
    return {
      status: 'sent',
      url: config.url,
      response: { success: true },
    };
  }
}
