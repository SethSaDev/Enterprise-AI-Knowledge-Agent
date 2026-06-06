import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAgentDto,
  UpdateAgentDto,
  AddKnowledgeBaseDto,
  ConfigureToolsDto,
  UpdatePromptTemplateDto,
  CreatePromptTemplateDto,
} from './dto';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agents for organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.agentService.findAll(user.organizationId, +page, +limit, search, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.findById(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new agent' })
  async create(@Body() createAgentDto: CreateAgentDto, @CurrentUser() user) {
    return this.agentService.create(createAgentDto, user.organizationId, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent' })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() user,
  ) {
    return this.agentService.update(id, updateAgentDto, user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete agent' })
  async delete(@Param('id') id: string, @CurrentUser() user) {
    await this.agentService.delete(id, user.organizationId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate agent' })
  async activate(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.activate(id, user.organizationId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate agent' })
  async deactivate(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.deactivate(id, user.organizationId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone agent' })
  async clone(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.clone(id, user.organizationId, user.id);
  }

  @Get(':id/knowledge-bases')
  @ApiOperation({ summary: 'Get agent knowledge bases' })
  async getKnowledgeBases(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.getKnowledgeBases(id, user.organizationId);
  }

  @Post(':id/knowledge-bases')
  @ApiOperation({ summary: 'Add knowledge base to agent' })
  async addKnowledgeBase(
    @Param('id') id: string,
    @Body() addKnowledgeBaseDto: AddKnowledgeBaseDto,
    @CurrentUser() user,
  ) {
    return this.agentService.addKnowledgeBase(id, addKnowledgeBaseDto, user.organizationId);
  }

  @Delete(':id/knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove knowledge base from agent' })
  async removeKnowledgeBase(
    @Param('id') id: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @CurrentUser() user,
  ) {
    await this.agentService.removeKnowledgeBase(id, knowledgeBaseId, user.organizationId);
  }

  @Get(':id/tools')
  @ApiOperation({ summary: 'Get agent tools' })
  async getTools(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.getTools(id, user.organizationId);
  }

  @Put(':id/tools')
  @ApiOperation({ summary: 'Configure agent tools' })
  async configureTools(
    @Param('id') id: string,
    @Body() configureToolsDto: ConfigureToolsDto,
    @CurrentUser() user,
  ) {
    return this.agentService.configureTools(id, configureToolsDto, user.organizationId);
  }

  @Get(':id/prompt-templates')
  @ApiOperation({ summary: 'Get agent prompt templates' })
  async getPromptTemplates(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.getPromptTemplates(id, user.organizationId);
  }

  @Post(':id/prompt-templates')
  @ApiOperation({ summary: 'Create prompt template' })
  async createPromptTemplate(
    @Param('id') id: string,
    @Body() createPromptTemplateDto: CreatePromptTemplateDto,
    @CurrentUser() user,
  ) {
    return this.agentService.createPromptTemplate(id, createPromptTemplateDto, user.organizationId);
  }

  @Put(':id/prompt-templates/:templateId')
  @ApiOperation({ summary: 'Update prompt template' })
  async updatePromptTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @Body() updatePromptTemplateDto: UpdatePromptTemplateDto,
    @CurrentUser() user,
  ) {
    return this.agentService.updatePromptTemplate(
      id,
      templateId,
      updatePromptTemplateDto,
      user.organizationId,
    );
  }

  @Delete(':id/prompt-templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete prompt template' })
  async deletePromptTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user,
  ) {
    await this.agentService.deletePromptTemplate(id, templateId, user.organizationId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test agent with sample message' })
  async testAgent(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser() user,
  ) {
    return this.agentService.testAgent(id, message, user.organizationId);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get agent usage statistics' })
  async getUsage(@Param('id') id: string, @CurrentUser() user) {
    return this.agentService.getUsage(id, user.organizationId);
  }
}