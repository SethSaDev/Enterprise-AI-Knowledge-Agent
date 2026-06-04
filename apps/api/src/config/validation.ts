import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  IsBoolean,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

class OpenAIConfig {
  @IsString()
  API_KEY: string;

  @IsString()
  MODEL: string;

  @IsString()
  EMBEDDING_MODEL: string;

  @IsNumber()
  @Min(1)
  @Max(32768)
  MAX_TOKENS: number;

  @IsNumber()
  @Min(0)
  @Max(2)
  TEMPERATURE: number;
}

class AnthropicConfig {
  @IsString()
  API_KEY: string;

  @IsString()
  MODEL: string;

  @IsNumber()
  MAX_TOKENS: number;

  @IsNumber()
  TEMPERATURE: number;
}

class QdrantConfig {
  @IsUrl()
  URL: string;

  @IsOptional()
  @IsString()
  API_KEY?: string;

  @IsString()
  COLLECTION_NAME: string;

  @IsNumber()
  VECTOR_SIZE: number;
}

class MinioConfig {
  @IsString()
  ENDPOINT: string;

  @IsString()
  ACCESS_KEY: string;

  @IsString()
  SECRET_KEY: string;

  @IsString()
  BUCKET: string;

  @IsBoolean()
  USE_SSL: boolean;
}

class RateLimitConfig {
  @IsNumber()
  TTL: number;

  @IsNumber()
  LIMIT: number;

  @IsNumber()
  OPENAI_LIMIT: number;

  @IsNumber()
  ANTHROPIC_LIMIT: number;
}

class EnvironmentVariables {
  @IsEnum(['development', 'production', 'staging', 'test'])
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsNumber()
  WS_PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @ValidateNested()
  @Type(() => OpenAIConfig)
  OPENAI: OpenAIConfig;

  @ValidateNested()
  @Type(() => AnthropicConfig)
  ANTHROPIC: AnthropicConfig;

  @ValidateNested()
  @Type(() => QdrantConfig)
  QDRANT: QdrantConfig;

  @ValidateNested()
  @Type(() => MinioConfig)
  MINIO: MinioConfig;

  @ValidateNested()
  @Type(() => RateLimitConfig)
  RATE_LIMIT: RateLimitConfig;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  
  // Validate required fields in production
  if (process.env.NODE_ENV === 'production') {
    const errors = [];
    
    if (!validatedConfig.JWT_SECRET || validatedConfig.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    
    if (!validatedConfig.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    
    if (!validatedConfig.OPENAI.API_KEY) {
      errors.push('OPENAI_API_KEY is required in production');
    }
  }
  
  if (errors && errors.length > 0) {
    throw new Error(`Config validation failed: ${errors.join(', ')}`);
  }
  
  return validatedConfig;
}