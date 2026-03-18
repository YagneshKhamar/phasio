import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  openaiApiKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  anthropicApiKey?: string | null;

  @ApiPropertyOptional()
  @IsIn(['openai', 'anthropic'])
  @IsOptional()
  preferredProvider?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  openaiModel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  anthropicModel?: string;
}
