import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class UpdateTeamDto {
  @ApiProperty({ required: false, description: 'Team name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, description: 'Team description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Team settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}