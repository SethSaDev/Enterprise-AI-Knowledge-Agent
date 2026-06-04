import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');

    // Middleware for soft deletes
    this.$use(async (params, next) => {
      if (params.model === 'Organization' && params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }
      return next(params);
    });

    // Middleware for audit logging
    this.$use(async (params, next) => {
      const result = await next(params);
      
      // Log create/update/delete operations
      if (['create', 'update', 'delete', 'deleteMany'].includes(params.action)) {
        // Async audit logging without blocking
        this.logAudit(params, result).catch(err => {
          this.logger.error('Failed to create audit log', err);
        });
      }
      
      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async logAudit(params: any, result: any) {
    try {
      const requestId = process.env.REQUEST_ID;
      const userId = await this.$queryRaw`SELECT current_setting('app.current_user_id', true)`;
      const orgId = await this.$queryRaw`SELECT current_setting('app.current_org_id', true)`;

      // Implementation for audit logging
      // This would create an AuditLog record
    } catch (error) {
      this.logger.error('Audit logging failed', error);
    }
  }
}