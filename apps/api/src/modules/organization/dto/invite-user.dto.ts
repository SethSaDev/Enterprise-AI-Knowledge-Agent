import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole, default: UserRole.USER, description: 'User role' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ required: false, type: [String], description: 'Team IDs to add user to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];
}