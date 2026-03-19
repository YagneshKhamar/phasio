import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateApiKeyDto {
  @ApiProperty({ description: 'The full Phasio API key to validate' })
  @IsString()
  key: string;
}
