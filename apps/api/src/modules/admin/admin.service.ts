import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  async getMetrics(period: string) {
    // Mock metrics data
    return {
      period,
      totalUsers: 1250,
      totalOrganizations: 45,
      totalAgents: 320,
      totalConversations: 15420,
      totalTokens: 2850000,
      apiCalls: 32450,
      activeUsers: 890,
      revenue: 12450,
      metrics: {
        daily: {
          users: [120, 135, 142, 158, 165, 170, 180],
          conversations: [320, 345, 358, 370, 385, 400, 420],
          tokens: [45000, 48000, 50000, 52000, 55000, 58000, 62000],
        },
      },
    };
  }

  async getUsers(page: number, limit: number, search?: string) {
    // Mock users data
    const users = [
      { id: '1', email: 'user1@example.com', name: 'John Doe', role: 'ADMIN', status: 'ACTIVE', createdAt: new Date() },
      { id: '2', email: 'user2@example.com', name: 'Jane Smith', role: 'USER', status: 'ACTIVE', createdAt: new Date() },
      { id: '3', email: 'user3@example.com', name: 'Bob Johnson', role: 'USER', status: 'INACTIVE', createdAt: new Date() },
    ];
    
    const filtered = search 
      ? users.filter(u => u.email.includes(search) || u.name.includes(search))
      : users;
    
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

  async updateUser(userId: string, updateData: any) {
    this.logger.log(`Updating user ${userId}:`, updateData);
    return { id: userId, ...updateData, updatedAt: new Date() };
  }

  async deleteUser(userId: string) {
    this.logger.log(`Deleting user ${userId}`);
    // Mock deletion
    return { success: true };
  }

  async getOrganizations(page: number, limit: number) {
    const orgs = [
      { id: '1', name: 'Acme Corp', plan: 'PRO', users: 25, agents: 8, createdAt: new Date() },
      { id: '2', name: 'TechStart Inc', plan: 'FREE', users: 5, agents: 3, createdAt: new Date() },
      { id: '3', name: 'Enterprise Solutions', plan: 'ENTERPRISE', users: 120, agents: 25, createdAt: new Date() },
    ];
    
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: orgs.slice(start, end),
      meta: {
        page,
        limit,
        total: orgs.length,
        totalPages: Math.ceil(orgs.length / limit),
      },
    };
  }

  async getAuditLogs(page: number, limit: number, action?: string, userId?: string) {
    const logs = [
      { id: '1', action: 'USER_LOGIN', userId: 'user1', details: 'Login from IP 192.168.1.1', timestamp: new Date() },
      { id: '2', action: 'AGENT_CREATED', userId: 'user2', details: 'Created agent "Support Bot"', timestamp: new Date() },
      { id: '3', action: 'DOCUMENT_UPLOADED', userId: 'user1', details: 'Uploaded company-policy.pdf', timestamp: new Date() },
    ];
    
    let filtered = logs;
    if (action) filtered = filtered.filter(l => l.action === action);
    if (userId) filtered = filtered.filter(l => l.userId === userId);
    
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

  async getCostAnalytics(period: string) {
    return {
      period,
      totalCost: 12450.50,
      costByProvider: {
        openai: 8920.25,
        anthropic: 3530.25,
      },
      costByOrganization: [
        { orgId: '1', orgName: 'Acme Corp', cost: 5250.00 },
        { orgId: '2', orgName: 'TechStart Inc', cost: 1250.00 },
        { orgId: '3', orgName: 'Enterprise Solutions', cost: 5950.50 },
      ],
      dailyCost: [320, 345, 358, 370, 385, 400, 420],
    };
  }

  async getSystemHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        qdrant: 'healthy',
        api: 'healthy',
      },
      metrics: {
        cpu: 45,
        memory: 62,
        disk: 38,
      },
      timestamp: new Date(),
    };
  }

  async getFeatureFlags() {
    return {
      workflows: true,
      analytics: true,
      auditLogs: true,
      oauthGoogle: false,
      oauthGithub: false,
      webhooks: true,
      apiKeys: true,
    };
  }

  async updateFeatureFlags(flags: Record<string, boolean>) {
    this.logger.log('Updating feature flags:', flags);
    return flags;
  }
}
