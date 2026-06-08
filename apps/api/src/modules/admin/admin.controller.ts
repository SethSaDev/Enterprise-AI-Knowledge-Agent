import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  async getMetrics(@Query('period') period?: string) {
    return this.adminService.getMetrics(period || 'day');
  }

  @Get('users')
  async getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Put('users/:userId')
  async updateUser(@Param('userId') userId: string, @Body() updateData: any) {
    return this.adminService.updateUser(userId, updateData);
  }

  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    await this.adminService.deleteUser(userId);
    return { success: true };
  }

  @Get('organizations')
  async getOrganizations(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getOrganizations(+page, +limit);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs(+page, +limit, action, userId);
  }

  @Get('analytics/costs')
  async getCostAnalytics(@Query('period') period = 'month') {
    return this.adminService.getCostAnalytics(period);
  }

  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('feature-flags')
  async getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Put('feature-flags')
  async updateFeatureFlags(@Body() flags: Record<string, boolean>) {
    return this.adminService.updateFeatureFlags(flags);
  }
}
