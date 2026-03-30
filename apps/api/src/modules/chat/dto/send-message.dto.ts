import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ required: false, description: 'Conversation ID (optional, creates new if not provided)' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}