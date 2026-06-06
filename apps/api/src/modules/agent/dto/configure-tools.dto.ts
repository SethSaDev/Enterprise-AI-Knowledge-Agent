import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ToolDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['WEB_SEARCH', 'CALCULATOR', 'DATABASE_QUERY', 'API_CALL', 'FILE_OPERATION', 'EMAIL', 'CUSTOM'] })
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class ConfigureToolsDto {
  @ApiProperty({ type: [ToolDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolDto)
  tools: ToolDto[];
}