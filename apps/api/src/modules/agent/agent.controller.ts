import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.agentService.findAll(page, limit);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.agentService.findById(id);
  }

  @Post()
  async create(@Body() createAgentDto: any) {
    return this.agentService.create(createAgentDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateAgentDto: any) {
    return this.agentService.update(id, updateAgentDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.agentService.delete(id);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.agentService.activate(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.agentService.deactivate(id);
  }

  @Post(':id/clone')
  async clone(@Param('id') id: string) {
    return this.agentService.clone(id);
  }
}
