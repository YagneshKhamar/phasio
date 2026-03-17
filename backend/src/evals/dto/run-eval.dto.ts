import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RunEvalDto {
  @ApiProperty({ description: 'First prompt version ID to compare' })
  @IsString()
  versionAId: string;

  @ApiProperty({ description: 'Second prompt version ID to compare' })
  @IsString()
  versionBId: string;

  @ApiProperty({ description: 'Test suite ID to run against' })
  @IsString()
  suiteId: string;
}
