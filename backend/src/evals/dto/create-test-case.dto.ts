import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, MinLength } from 'class-validator';

export class CreateTestCaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  input: string;

  @ApiProperty({ enum: ['contains', 'llm_judge'] })
  @IsIn(['contains', 'llm_judge'])
  checkType: string;

  @ApiProperty({
    description:
      'For contains: the string to check. For llm_judge: the scoring criteria',
  })
  @IsString()
  @MinLength(1)
  checkValue: string;
}
