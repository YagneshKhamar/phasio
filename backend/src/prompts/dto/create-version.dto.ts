import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateVersionDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  template: string;
}
