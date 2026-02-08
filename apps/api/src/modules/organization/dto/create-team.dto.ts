import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Engineering Team', description: 'Team name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false, description: 'Team description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Team settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}