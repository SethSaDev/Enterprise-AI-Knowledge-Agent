export default () => ({
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  WS_PORT: parseInt(process.env.WS_PORT || '3001', 10),
  API_PREFIX: process.env.API_PREFIX || 'api/v1',
  APP_NAME: process.env.APP_NAME || 'Knowledge Agent Platform',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  DB_IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // AI Providers
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY,
    MODEL: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
    TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  
  ANTHROPIC: {
    API_KEY: process.env.ANTHROPIC_API_KEY,
    MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    MAX_TOKENS: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
    TEMPERATURE: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
  },
  
  AZURE_OPENAI: {
    API_KEY: process.env.AZURE_OPENAI_API_KEY,
    ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
  },
  
  // Vector Store
  QDRANT: {
    URL: process.env.QDRANT_URL || 'http://localhost:6333',
    API_KEY: process.env.QDRANT_API_KEY,
    COLLECTION_NAME: process.env.QDRANT_COLLECTION_NAME || 'knowledge_chunks',
    VECTOR_SIZE: parseInt(process.env.QDRANT_VECTOR_SIZE || '1536', 10),
  },
  
  // Storage
  MINIO: {
    ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost:9000',
    ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    SECRET_KEY: process.env.MINIO_SECRET_KEY,
    BUCKET: process.env.MINIO_BUCKET || 'knowledge-documents',
    USE_SSL: process.env.MINIO_USE_SSL === 'true',
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    TTL: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    LIMIT: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || '1000', 10),
    OPENAI_LIMIT: parseInt(process.env.RATE_LIMIT_OPENAI_PER_MINUTE || '60', 10),
    ANTHROPIC_LIMIT: parseInt(process.env.RATE_LIMIT_ANTHROPIC_PER_MINUTE || '60', 10),
  },
  
  // Budget Limits
  BUDGET: {
    FREE: parseInt(process.env.BUDGET_MONTHLY_LIMIT_FREE || '100000', 10),
    PRO: parseInt(process.env.BUDGET_MONTHLY_LIMIT_PRO || '1000000', 10),
    BUSINESS: parseInt(process.env.BUDGET_MONTHLY_LIMIT_BUSINESS || '10000000', 10),
    ENTERPRISE: parseInt(process.env.BUDGET_MONTHLY_LIMIT_ENTERPRISE || '100000000', 10),
  },
  
  // Security
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3002'],
  CSRF_SECRET: process.env.CSRF_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  
  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Feature Flags
  FEATURES: {
    ENABLE_OAUTH_GOOGLE: process.env.ENABLE_OAUTH_GOOGLE === 'true',
    ENABLE_OAUTH_GITHUB: process.env.ENABLE_OAUTH_GITHUB === 'true',
    ENABLE_WORKFLOWS: process.env.ENABLE_WORKFLOWS !== 'false',
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
    ENABLE_AUDIT_LOGS: process.env.ENABLE_AUDIT_LOGS !== 'false',
  },
  
  // Email
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    USER: process.env.SMTP_USER,
    PASSWORD: process.env.SMTP_PASSWORD,
    FROM: process.env.SMTP_FROM || 'noreply@knowledge-agent.com',
  },
  
  // Health check
  HEALTH_CHECK: {
    THRESHOLD: parseInt(process.env.HEALTH_CHECK_THRESHOLD || '5000', 10),
    TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '3000', 10),
  },
});