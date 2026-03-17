import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  openaiApiKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @ApiProperty({ required: false, enum: ['openai', 'anthropic'] })
  @IsOptional()
  @IsIn(['openai', 'anthropic'])
  preferredProvider?: string;
}
