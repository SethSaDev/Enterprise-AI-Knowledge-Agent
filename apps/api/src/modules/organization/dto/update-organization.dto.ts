import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({ required: false, description: 'Organization name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, description: 'Organization logo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @ApiProperty({ required: false, description: 'Organization settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}