import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ required: false, description: 'Conversation title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}