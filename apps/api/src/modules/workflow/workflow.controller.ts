import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.workflowService.findAll(+page, +limit);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.workflowService.findById(id);
  }

  @Post()
  async create(@Body() createWorkflowDto: any) {
    return this.workflowService.create(createWorkflowDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWorkflowDto: any) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.workflowService.delete(id);
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Body() input: any) {
    return this.workflowService.execute(id, input);
  }

  @Get(':id/executions')
  async getExecutions(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.workflowService.getExecutions(id, +page, +limit);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.workflowService.activate(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.workflowService.deactivate(id);
  }
}
