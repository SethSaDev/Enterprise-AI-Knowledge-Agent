import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class AddKnowledgeBaseDto {
  @ApiProperty({ description: 'Knowledge base ID' })
  @IsString()
  knowledgeBaseId: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;
}