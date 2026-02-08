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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteUserDto,
  UpdateTeamDto,
  CreateTeamDto,
} from './dto';
import { UserRole } from '@prisma/client';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all organizations (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10, @Query('search') search?: string) {
    return this.organizationService.findAll(+page, +limit, search);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current user organization' })
  async getCurrentOrganization(@CurrentUser() user) {
    return this.organizationService.findById(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get organization by ID' })
  async findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new organization' })
  async create(@Body() createOrgDto: CreateOrganizationDto, @CurrentUser() user) {
    return this.organizationService.create(createOrgDto, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: string, @Body() updateOrgDto: UpdateOrganizationDto) {
    return this.organizationService.update(id, updateOrgDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  async delete(@Param('id') id: string) {
    await this.organizationService.delete(id);
  }

  @Get(':id/teams')
  @ApiOperation({ summary: 'Get organization teams' })
  async getTeams(@Param('id') id: string) {
    return this.organizationService.getTeams(id);
  }

  @Post(':id/teams')
  @ApiOperation({ summary: 'Create team' })
  async createTeam(@Param('id') id: string, @Body() createTeamDto: CreateTeamDto, @CurrentUser() user) {
    return this.organizationService.createTeam(id, createTeamDto, user.id);
  }

  @Put(':id/teams/:teamId')
  @ApiOperation({ summary: 'Update team' })
  async updateTeam(@Param('id') id: string, @Param('teamId') teamId: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.organizationService.updateTeam(id, teamId, updateTeamDto);
  }

  @Delete(':id/teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete team' })
  async deleteTeam(@Param('id') id: string, @Param('teamId') teamId: string) {
    await this.organizationService.deleteTeam(id, teamId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite user to organization' })
  async inviteUser(@Param('id') id: string, @Body() inviteDto: InviteUserDto, @CurrentUser() user) {
    return this.organizationService.inviteUser(id, inviteDto, user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  async getMembers(@Param('id') id: string) {
    return this.organizationService.getMembers(id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    await this.organizationService.removeMember(id, userId);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
  ) {
    return this.organizationService.updateMemberRole(id, userId, role);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get organization usage statistics' })
  async getUsage(@Param('id') id: string, @Query('period') period?: string) {
    return this.organizationService.getUsageStats(id, period || 'month');
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.organizationService.updateSettings(id, settings);
  }

  @Post(':id/upgrade')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upgrade organization plan' })
  async upgradePlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.organizationService.upgradePlan(id, plan);
  }

  @Get(':id/audit-logs')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get organization audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  async getAuditLogs(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('action') action?: string,
  ) {
    return this.organizationService.getAuditLogs(id, +page, +limit, action);
  }
}