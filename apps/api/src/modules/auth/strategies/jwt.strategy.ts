import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const { sub: userId, sessionId, orgId } = payload;

    // Check if session exists and is valid
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            organization: true,
            teams: {
              include: {
                team: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const { user } = session;

    if (user.status !== 'ACTIVE') {
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account has been suspended');
      }
      throw new UnauthorizedException('Account is not active');
    }

    // Check organization
    if (!user.organization) {
      throw new UnauthorizedException('User has no organization');
    }

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);

    // Cache permissions in Redis
    const cacheKey = `user:${user.id}:permissions`;
    await this.prisma.$transaction([
      this.prisma.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, true)`,
      this.prisma.$executeRaw`SELECT set_config('app.current_org_id', ${user.organizationId}, true)`,
    ]);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      teams: user.teams.map(t => ({
        id: t.team.id,
        name: t.team.name,
        role: t.role,
      })),
      permissions,
      sessionId: session.id,
    };
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    const permissions = new Set<string>();

    // Global role-based permissions
    switch (user.role) {
      case 'SUPER_ADMIN':
        permissions.add('*');
        permissions.add('admin:*');
        permissions.add('system:*');
        break;
      case 'ADMIN':
        permissions.add('admin:*');
        permissions.add('organizations:manage');
        permissions.add('users:manage');
        permissions.add('agents:manage');
        permissions.add('knowledge:manage');
        permissions.add('workflows:manage');
        permissions.add('analytics:view');
        break;
      case 'USER':
        permissions.add('agents:read');
        permissions.add('agents:write');
        permissions.add('knowledge:read');
        permissions.add('knowledge:write');
        permissions.add('chat:*');
        permissions.add('workflows:read');
        permissions.add('workflows:execute');
        permissions.add('analytics:view_own');
        break;
      case 'VIEWER':
        permissions.add('agents:read');
        permissions.add('knowledge:read');
        permissions.add('chat:read');
        permissions.add('analytics:view_own');
        break;
    }

    // Team-based permissions
    for (const teamMember of user.teams) {
      const teamId = teamMember.team.id;
      switch (teamMember.role) {
        case 'OWNER':
          permissions.add(`team:${teamId}:*`);
          permissions.add(`team:${teamId}:admin`);
          permissions.add(`team:${teamId}:manage_members`);
          break;
        case 'ADMIN':
          permissions.add(`team:${teamId}:admin`);
          permissions.add(`team:${teamId}:manage`);
          break;
        case 'MEMBER':
          permissions.add(`team:${teamId}:write`);
          permissions.add(`team:${teamId}:create`);
          break;
        case 'VIEWER':
          permissions.add(`team:${teamId}:read`);
          break;
      }
    }

    return Array.from(permissions);
  }
}