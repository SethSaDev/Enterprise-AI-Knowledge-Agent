import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, MinLength, MaxLength } from 'class-validator';
import { PlanType } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Organization name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: PlanType, default: PlanType.FREE, required: false })
  @IsOptional()
  @IsEnum(PlanType)
  plan?: PlanType;

  @ApiProperty({ required: false, description: 'Organization settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}