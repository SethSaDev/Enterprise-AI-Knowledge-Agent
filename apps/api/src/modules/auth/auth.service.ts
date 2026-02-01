import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, TokenPayload, JwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const { email, password, firstName, lastName, organizationName } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: organizationName,
        slug: this.generateSlug(organizationName),
        plan: 'FREE',
        settings: {
          defaultLanguage: 'en',
          timezone: 'UTC',
          features: {
            maxAgents: 5,
            maxKnowledgeBases: 3,
            maxTeamMembers: 10,
            maxStorageGB: 1,
            customPrompts: false,
            apiAccess: true,
          },
          notifications: {
            email: true,
            slack: false,
            webhook: false,
          },
        },
      },
    });

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        organizationId: organization.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerificationToken: uuidv4(),
      },
    });

    // Create default team
    const team = await this.prisma.team.create({
      data: {
        name: 'Default Team',
        description: 'Default team for the organization',
        organizationId: organization.id,
        settings: {
          memberPermissions: ['read', 'write', 'create'],
        },
      },
    });

    // Add user to team as owner
    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    // Create default agent for the organization
    await this.createDefaultAgent(organization.id, user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, organization.id);

    // Create session
    await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

    // Send verification email
    await this.emailQueue.add('send-verification', {
      to: user.email,
      name: `${firstName} ${lastName}`,
      token: user.emailVerificationToken,
    });

    // Create audit log
    await this.createAuditLog({
      organizationId: organization.id,
      userId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: {
        firstName,
        lastName,
        email,
        ipAddress,
        userAgent,
      },
    });

    // Emit event
    this.eventEmitter.emit('user.registered', {
      userId: user.id,
      organizationId: organization.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user with organization
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    const isLocked = await this.redisService.get(`locked:${email}`);
    if (isLocked) {
      throw new UnauthorizedException('Account is temporarily locked. Try again later.');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logFailedAttempt(email, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account has been suspended. Contact support.');
      }
      if (user.status === 'PENDING_VERIFICATION') {
        throw new UnauthorizedException('Please verify your email before logging in.');
      }
      throw new UnauthorizedException('Account is not active');
    }

    // Check organization status
    if (user.organization && user.organization.plan === 'FREE') {
      const usage = await this.checkOrganizationUsage(user.organizationId);
      if (usage.exceedsLimits) {
        this.logger.warn(`Organization ${user.organizationId} exceeded usage limits`);
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.organizationId);

    // Create session
    const session = await this.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    // Clear failed attempts
    await this.redisService.del(`failed_login:${email}`);

    // Create audit log
    await this.createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { ipAddress, userAgent, sessionId: session.id },
    });

    // Emit event
    this.eventEmitter.emit('user.logged_in', {
      userId: user.id,
      organizationId: user.organizationId,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      }) as JwtPayload;

      // Check if session exists
      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Rotate refresh token
      const newRefreshToken = uuidv4();
      await this.prisma.session.update({
        where: { id: session.id },
        data: { refreshToken: newRefreshToken },
      });

      // Generate new access token
      const accessToken = this.jwtService.sign(
        {
          sub: session.userId,
          email: session.user.email,
          sessionId: session.id,
          orgId: session.user.organizationId,
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
        },
      );

      return { accessToken };
    } catch (error) {
      this.logger.error(`Refresh token error: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    // Delete session
    await this.prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });

    // Clear Redis cache
    await this.redisService.del(`user:${userId}:session:${sessionId}`);
    await this.redisService.del(`user:${userId}:permissions`);

    // Create audit log
    await this.createAuditLog({
      organizationId: null,
      userId,
      action: 'USER_LOGOUT',
      resourceType: 'SESSION',
      resourceId: sessionId,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        teams: {
          include: {
            team: true,
          },
        },
        apiKeys: {
          where: { expiresAt: { gt: new Date() } },
          select: { id: true, name: true, lastUsedAt: true, createdAt: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
        settings: user.organization.settings,
      },
      teams: user.teams.map(t => ({
        id: t.team.id,
        name: t.team.name,
        role: t.role,
      })),
      apiKeys: user.apiKeys,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      emailVerified: !!user.emailVerifiedAt,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions except current
    await this.prisma.session.deleteMany({
      where: { userId, refreshToken: { not: user.passwordHash } },
    });

    this.eventEmitter.emit('user.password_changed', { userId });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: expiresAt,
        },
      });

      await this.emailQueue.add('send-password-reset', {
        to: user.email,
        name: `${user.firstName} ${user.lastName}`,
        token: resetToken,
      });
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all sessions
    await this.prisma.session.deleteMany({
      where: { userId: user.id },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        status: 'ACTIVE',
      },
    });
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified or user not found');
    }

    if (!user.emailVerificationToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerificationToken: uuidv4() },
      });
    }

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    await this.emailQueue.add('send-verification', {
      to: updatedUser.email,
      name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      token: updatedUser.emailVerificationToken,
    });
  }

  private async generateTokens(
    userId: string,
    organizationId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = uuidv4();

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        orgId: organizationId,
        sessionId,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.session.create({
      data: {
        userId,
        token: uuidv4(),
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  }

  private async createDefaultAgent(organizationId: string, userId: string) {
    return this.prisma.agent.create({
      data: {
        name: 'General Assistant',
        description: 'Default AI assistant for general questions',
        systemPrompt: `You are a helpful AI assistant for {organization_name}. 
        You help users with their questions based on the provided knowledge base.
        Be concise, accurate, and helpful. If you don't know something, say so.`,
        modelConfig: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        tools: [
          {
            name: 'knowledge_search',
            type: 'RETRIEVAL',
            enabled: true,
            config: { topK: 5, similarityThreshold: 0.7 },
          },
        ],
        memoryConfig: {
          type: 'conversation',
          maxMessages: 20,
          summaryThreshold: 10,
        },
        temperature: 0.7,
        maxTokens: 2000,
        organizationId,
        createdBy: userId,
        isActive: true,
        version: 1,
      },
    });
  }

  private async checkOrganizationUsage(organizationId: string) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const metrics = await this.prisma.usageMetric.aggregate({
      where: {
        organizationId,
        timestamp: { gte: currentMonth },
        metricType: 'TOKENS_USED',
      },
      _sum: {
        value: true,
      },
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const budget = this.configService.get(`BUDGET.${organization.plan.toUpperCase()}`, 100000);

    return {
      totalTokensUsed: metrics._sum.value || 0,
      budget,
      exceedsLimits: (metrics._sum.value || 0) > budget,
    };
  }

  private async logFailedAttempt(email: string, ipAddress: string) {
    const key = `failed_login:${email}`;
    const attempts = await this.redisService.incr(key);

    if (attempts === 1) {
      await this.redisService.expire(key, 3600);
    }

    if (attempts >= 5) {
      await this.redisService.setex(`locked:${email}`, 1800, 'true');
      this.logger.warn(`Account locked for ${email} due to multiple failed attempts`);
    }

    await this.createAuditLog({
      organizationId: null,
      userId: null,
      action: 'FAILED_LOGIN',
      resourceType: 'USER',
      metadata: { email, ipAddress, attempts },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async createAuditLog(data: any) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }
}