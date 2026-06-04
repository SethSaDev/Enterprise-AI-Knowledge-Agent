import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { AgentModule } from './modules/agent/agent.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Shared modules
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { AIServiceModule } from './shared/ai/ai-service.module';
import { VectorStoreModule } from './shared/vector-store/vector-store.module';
import { StorageModule } from './shared/storage/storage.module';
import { QueueModule } from './shared/queue/queue.module';

// Middleware
import { LoggerMiddleware } from './shared/middleware/logger.middleware';
import { RateLimitMiddleware } from './shared/middleware/rate-limit.middleware';
import { TenantMiddleware } from './shared/middleware/tenant.middleware';

// Configuration
import configuration from './config/configuration';
import { validate } from './config/validation';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    
    // Structured logging
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', 'info'),
          transport: config.get('NODE_ENV') !== 'production'
            ? { 
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
          serializers: {
            req: (req) => ({
              method: req.method,
              url: req.url,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },
        },
      }),
    }),
    
    // Event driven architecture
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    
    // Job queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
          db: config.get('REDIS_DB', 0),
          keyPrefix: 'bull:',
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
          timeout: 30000,
        },
        limiter: {
          max: 100,
          duration: 1000,
        },
      }),
    }),
    
    // Cron jobs
    ScheduleModule.forRoot(),
    
    // Core infrastructure modules
    DatabaseModule,
    RedisModule,
    AIServiceModule,
    VectorStoreModule,
    StorageModule,
    QueueModule,
    
    // Feature modules
    AuthModule,
    OrganizationModule,
    AgentModule,
    KnowledgeBaseModule,
    ChatModule,
    WorkflowModule,
    AdminModule,
    AnalyticsModule,
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, RateLimitMiddleware, TenantMiddleware)
      .forRoutes('*');
  }
}