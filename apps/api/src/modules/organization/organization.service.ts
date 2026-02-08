import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateOrganizationDto, UpdateOrganizationDto, InviteUserDto, CreateTeamDto, UpdateTeamDto } from './dto';
import { UserRole, PlanType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {}

  async findAll(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              agents: true,
              knowledgeBases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        agents: {
          where: { isActive: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        knowledgeBases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            users: true,
            agents: true,
            knowledgeBases: true,
            workflows: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get usage metrics from Redis cache
    const usageCacheKey = `org:${id}:usage`;
    let usageMetrics = await this.redisService.get(usageCacheKey);
    
    if (!usageMetrics) {
      usageMetrics = await this.calculateUsageMetrics(id);
      await this.redisService.setex(usageCacheKey, 300, JSON.stringify(usageMetrics)); // Cache for 5 minutes
    } else {
      usageMetrics = JSON.parse(usageMetrics);
    }

    return {
      ...organization,
      usage: usageMetrics,
    };
  }

  async create(createOrgDto: CreateOrganizationDto, userId: string) {
    const { name, plan, settings } = createOrgDto;
    const slug = this.generateSlug(name);

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this name already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name,
        slug,
        plan: plan || 'FREE',
        settings: settings || {},
      },
    });

    // Add user as member
    await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId: organization.id, role: 'ADMIN' },
    });

    // Create default team
    await this.prisma.team.create({
      data: {
        name: 'Default Team',
        description: 'Default team for the organization',
        organizationId: organization.id,
        settings: {
          memberPermissions: ['read', 'write', 'create', 'delete'],
        },
      },
    });

    this.logger.log(`Organization created: ${organization.id} by user ${userId}`);

    // Queue analytics event
    await this.analyticsQueue.add('track-event', {
      eventType: 'organization_created',
      organizationId: organization.id,
      userId,
      metadata: { plan: organization.plan },
    });

    return organization;
  }

  async update(id: string, updateOrgDto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (updateOrgDto.name) {
      const slug = this.generateSlug(updateOrgDto.name);
      const existingOrg = await this.prisma.organization.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });
      if (existingOrg) {
        throw new ConflictException('Organization with this name already exists');
      }
      updateOrgDto['slug'] = slug;
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: updateOrgDto,
    });

    // Invalidate cache
    await this.redisService.del(`org:${id}:usage`);

    this.logger.log(`Organization updated: ${id}`);

    return updated;
  }

  async delete(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, agents: true, knowledgeBases: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Soft delete - mark as inactive instead of hard delete
    await this.prisma.organization.update({
      where: { id },
      data: {
        settings: {
          ...organization.settings as any,
          deletedAt: new Date().toISOString(),
          isDeleted: true,
        },
      },
    });

    // Queue cleanup jobs
    await this.analyticsQueue.add('cleanup-organization', { organizationId: id });

    this.logger.warn(`Organization deleted: ${id}`);

    return { success: true, message: 'Organization deleted successfully' };
  }

  async getTeams(organizationId: string) {
    const teams = await this.prisma.team.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return teams;
  }

  async createTeam(organizationId: string, createTeamDto: CreateTeamDto, userId: string) {
    const { name, description, settings } = createTeamDto;

    const existingTeam = await this.prisma.team.findFirst({
      where: {
        organizationId,
        name,
      },
    });

    if (existingTeam) {
      throw new ConflictException('Team with this name already exists');
    }

    const team = await this.prisma.team.create({
      data: {
        name,
        description,
        organizationId,
        settings: settings || {},
      },
    });

    // Add creator as team owner
    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        role: 'OWNER',
      },
    });

    this.logger.log(`Team created: ${team.id} in organization ${organizationId}`);

    return team;
  }

  async updateTeam(organizationId: string, teamId: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (updateTeamDto.name && updateTeamDto.name !== team.name) {
      const existingTeam = await this.prisma.team.findFirst({
        where: {
          organizationId,
          name: updateTeamDto.name,
          id: { not: teamId },
        },
      });
      if (existingTeam) {
        throw new ConflictException('Team with this name already exists');
      }
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: updateTeamDto,
    });

    return updated;
  }

  async deleteTeam(organizationId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if it's the last team
    const teamCount = await this.prisma.team.count({
      where: { organizationId },
    });

    if (teamCount <= 1) {
      throw new BadRequestException('Cannot delete the last team. Create another team first.');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { success: true };
  }

  async inviteUser(organizationId: string, inviteDto: InviteUserDto, invitedBy: string) {
    const { email, role, teamIds } = inviteDto;

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Check if already a member
    if (user && user.organizationId === organizationId) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const invitationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Store invitation in Redis
    const invitationKey = `invitation:${invitationToken}`;
    await this.redisService.setex(
      invitationKey,
      604800, // 7 days in seconds
      JSON.stringify({
        email: email.toLowerCase(),
        organizationId,
        role,
        teamIds,
        invitedBy,
        expiresAt: expiresAt.toISOString(),
      }),
    );

    // Send invitation email
    await this.emailQueue.add('send-invitation', {
      to: email,
      organizationId,
      inviterId: invitedBy,
      token: invitationToken,
      role,
      expiresAt,
    });

    this.logger.log(`Invitation sent to ${email} for organization ${organizationId}`);

    return {
      success: true,
      message: 'Invitation sent successfully',
      invitationToken,
      expiresAt,
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitationKey = `invitation:${token}`;
    const invitationData = await this.redisService.get(invitationKey);

    if (!invitationData) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const { email, organizationId, role, teamIds } = JSON.parse(invitationData);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email.toLowerCase() !== email) {
      throw new ForbiddenException('This invitation is for a different email address');
    }

    // Update user's organization
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role: role as UserRole,
      },
    });

    // Add to teams
    if (teamIds && teamIds.length > 0) {
      for (const teamId of teamIds) {
        await this.prisma.teamMember.create({
          data: {
            teamId,
            userId,
            role: 'MEMBER',
          },
        });
      }
    }

    // Delete used invitation
    await this.redisService.del(invitationKey);

    this.logger.log(`User ${userId} accepted invitation to organization ${organizationId}`);

    return { success: true, organizationId };
  }

  async getMembers(organizationId: string) {
    const members = await this.prisma.user.findMany({
      where: { organizationId },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map(member => ({
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      avatar: member.avatar,
      role: member.role,
      status: member.status,
      lastLoginAt: member.lastLoginAt,
      teams: member.teams.map(t => ({
        id: t.team.id,
        name: t.team.name,
        role: t.role,
      })),
      joinedAt: member.createdAt,
    }));
  }

  async removeMember(organizationId: string, userId: string) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Check if last admin
    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin. Assign another admin first.');
      }
    }

    // Remove from organization
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        role: 'USER',
      },
    });

    // Remove from all teams
    await this.prisma.teamMember.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  async updateMemberRole(organizationId: string, userId: string, role: UserRole) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing last admin
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot change role of the last admin');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return {
      id: updated.id,
      role: updated.role,
    };
  }

  async getUsageStats(organizationId: string, period: string = 'month') {
    const startDate = new Date();
    if (period === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    }

    const [tokenUsage, apiCalls, searches, storage, conversations] = await Promise.all([
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          metricType: 'TOKENS_USED',
          timestamp: { gte: startDate },
        },
        _sum: { value: true },
      }),
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          metricType: 'API_CALLS',
          timestamp: { gte: startDate },
        },
        _sum: { value: true },
      }),
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          metricType: 'KNOWLEDGE_SEARCHES',
          timestamp: { gte: startDate },
        },
        _sum: { value: true },
      }),
      this.prisma.document.aggregate({
        where: {
          knowledgeBase: { organizationId },
          createdAt: { gte: startDate },
        },
        _sum: { size: true },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    return {
      period,
      startDate,
      tokensUsed: tokenUsage._sum.value || 0,
      apiCalls: apiCalls._sum.value || 0,
      knowledgeSearches: searches._sum.value || 0,
      storageUsed: storage._sum.size || 0,
      conversations,
    };
  }

  async updateSettings(organizationId: string, settings: any) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updatedSettings = {
      ...(organization.settings as any),
      ...settings,
    };

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    return updated.settings;
  }

  async upgradePlan(organizationId: string, plan: string) {
    if (!Object.values(PlanType).includes(plan as PlanType)) {
      throw new BadRequestException('Invalid plan type');
    }

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { plan: plan as PlanType },
    });

    this.logger.log(`Organization ${organizationId} upgraded to ${plan}`);

    return organization;
  }

  async getAuditLogs(organizationId: string, page: number, limit: number, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async calculateUsageMetrics(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
      monthlyUsage,
      weeklyUsage,
      dailyUsage,
      storage,
      activeUsers,
    ] = await Promise.all([
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          timestamp: { gte: startOfMonth },
        },
        _sum: { value: true },
      }),
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          timestamp: { gte: startOfWeek },
        },
        _sum: { value: true },
      }),
      this.prisma.usageMetric.aggregate({
        where: {
          organizationId,
          timestamp: { gte: new Date(now.setHours(0, 0, 0, 0)) },
        },
        _sum: { value: true },
      }),
      this.prisma.document.aggregate({
        where: {
          knowledgeBase: { organizationId },
        },
        _sum: { size: true },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      monthly: monthlyUsage._sum.value || 0,
      weekly: weeklyUsage._sum.value || 0,
      daily: dailyUsage._sum.value || 0,
      storageBytes: storage._sum.size || 0,
      activeUsers,
      limits: {
        agents: 10,
        knowledgeBases: 5,
        teamMembers: 20,
        storageGB: 1,
      },
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);
  }
}