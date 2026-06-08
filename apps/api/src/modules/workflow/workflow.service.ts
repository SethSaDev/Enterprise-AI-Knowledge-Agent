import { Injectable, Logger, NotFoundException } from '@nestjs/common';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: any;
  isActive: boolean;
  version: number;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private workflows: Workflow[] = [];
  private executions: WorkflowExecution[] = [];

  async findAll(page: number, limit: number) {
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: this.workflows.slice(start, end),
      meta: {
        page,
        limit,
        total: this.workflows.length,
        totalPages: Math.ceil(this.workflows.length / limit),
      },
    };
  }

  async findById(id: string) {
    const workflow = this.workflows.find(w => w.id === id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  async create(createWorkflowDto: any) {
    const workflow: Workflow = {
      id: `wf_${Date.now()}`,
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      definition: createWorkflowDto.definition || { steps: [] },
      isActive: true,
      version: 1,
      executionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.workflows.push(workflow);
    this.logger.log(`Workflow created: ${workflow.id}`);
    return workflow;
  }

  async update(id: string, updateWorkflowDto: any) {
    const workflow = await this.findById(id);
    const updated = {
      ...workflow,
      ...updateWorkflowDto,
      updatedAt: new Date(),
      version: workflow.version + 1,
    };
    
    const index = this.workflows.findIndex(w => w.id === id);
    this.workflows[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    this.workflows.splice(index, 1);
    this.logger.log(`Workflow deleted: ${id}`);
  }

  async execute(id: string, input: any) {
    const workflow = await this.findById(id);
    
    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId: id,
      status: 'running',
      input,
      startedAt: new Date(),
    };
    
    this.executions.push(execution);
    
    // Simulate workflow execution
    try {
      this.logger.log(`Executing workflow ${id} with input:`, input);
      
      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      execution.status = 'completed';
      execution.output = { result: 'Workflow executed successfully', data: input };
      execution.completedAt = new Date();
      
      // Update execution count
      workflow.executionCount++;
      const index = this.workflows.findIndex(w => w.id === id);
      this.workflows[index] = workflow;
      
      this.logger.log(`Workflow ${id} completed successfully`);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      this.logger.error(`Workflow ${id} failed: ${error.message}`);
      throw error;
    }
  }

  async getExecutions(workflowId: string, page: number, limit: number) {
    const filtered = this.executions.filter(e => e.workflowId === workflowId);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: filtered.slice(start, end),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  async activate(id: string) {
    const workflow = await this.findById(id);
    workflow.isActive = true;
    workflow.updatedAt = new Date();
    
    const index = this.workflows.findIndex(w => w.id === id);
    this.workflows[index] = workflow;
    return workflow;
  }

  async deactivate(id: string) {
    const workflow = await this.findById(id);
    workflow.isActive = false;
    workflow.updatedAt = new Date();
    
    const index = this.workflows.findIndex(w => w.id === id);
    this.workflows[index] = workflow;
    return workflow;
  }
}
