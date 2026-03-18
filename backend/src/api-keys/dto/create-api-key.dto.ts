import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'A friendly name for this key' })
  @IsString()
  @MinLength(1)
  name: string;
}
