import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private agents: any[] = [];

  async findAll(page: number, limit: number) {
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: this.agents.slice(start, end),
      meta: {
        page,
        limit,
        total: this.agents.length,
        totalPages: Math.ceil(this.agents.length / limit),
      },
    };
  }

  async findById(id: string) {
    const agent = this.agents.find(a => a.id === id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async create(createAgentDto: any) {
    const newAgent = {
      id: `agent_${Date.now()}`,
      ...createAgentDto,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      version: 1,
    };
    this.agents.push(newAgent);
    this.logger.log(`Agent created: ${newAgent.id}`);
    return newAgent;
  }

  async update(id: string, updateAgentDto: any) {
    const agent = await this.findById(id);
    const updated = { ...agent, ...updateAgentDto, updatedAt: new Date() };
    const index = this.agents.findIndex(a => a.id === id);
    this.agents[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.agents.findIndex(a => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    this.agents.splice(index, 1);
    this.logger.log(`Agent deleted: ${id}`);
    return { success: true };
  }

  async activate(id: string) {
    return this.update(id, { isActive: true });
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async clone(id: string) {
    const original = await this.findById(id);
    const cloned = {
      ...original,
      id: `agent_${Date.now()}`,
      name: `${original.name} (Copy)`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.agents.push(cloned);
    return cloned;
  }
}
