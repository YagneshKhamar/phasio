import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TelemetryVersionDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsNumber()
  score: number;

  @ApiProperty()
  @IsNumber()
  passedCases: number;

  @ApiProperty()
  @IsNumber()
  totalCases: number;

  @ApiProperty()
  @IsNumber()
  avgLatencyMs: number;
}

export class TelemetryProviderDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty({ type: [TelemetryVersionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryVersionDto)
  versions: TelemetryVersionDto[];

  @ApiProperty()
  @IsString()
  winner: string;
}

export class TelemetryDto {
  @ApiProperty()
  @IsString()
  apiKey: string;

  @ApiProperty({ type: [TelemetryProviderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryProviderDto)
  providers: TelemetryProviderDto[];

  @ApiProperty()
  @IsString()
  sdkVersion: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  promptId?: string;
}
