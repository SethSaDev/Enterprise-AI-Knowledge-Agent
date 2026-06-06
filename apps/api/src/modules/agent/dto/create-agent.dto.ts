import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ModelConfigDto {
  @ApiProperty({ default: 'gpt-4-turbo-preview' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ default: 0.7 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiProperty({ default: 2000 })
  @IsNumber()
  @Min(1)
  @Max(32768)
  @IsOptional()
  maxTokens?: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP?: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  frequencyPenalty?: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  presencePenalty?: number;
}

class MemoryConfigDto {
  @ApiProperty({ default: 'conversation' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ default: 20 })
  @IsNumber()
  @IsOptional()
  maxMessages?: number;

  @ApiProperty({ default: 10 })
  @IsNumber()
  @IsOptional()
  summaryThreshold?: number;
}

export class CreateAgentDto {
  @ApiProperty({ example: 'Customer Support Agent' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'You are a helpful customer support agent...' })
  @IsString()
  systemPrompt: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ModelConfigDto)
  modelConfig?: ModelConfigDto;

  @ApiProperty({ required: false, default: [] })
  @IsArray()
  @IsOptional()
  tools?: any[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MemoryConfigDto)
  memoryConfig?: MemoryConfigDto;

  @ApiProperty({ default: 0.7 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiProperty({ default: 2000 })
  @IsNumber()
  @Min(1)
  @Max(32768)
  @IsOptional()
  maxTokens?: number;
}