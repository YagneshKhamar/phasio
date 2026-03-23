import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RunEvalDto } from './dto/run-eval.dto';
import { TelemetryDto } from './dto/telemetry.dto';
import { EvalsService } from './evals.service';

@ApiTags('Evals')
@Controller('evals')
export class EvalsController {
  constructor(private readonly evalsService: EvalsService) {}

  // Public endpoint — SDK authenticates via API key in body
  @Post('telemetry')
  @ApiOperation({ summary: 'Receive SDK telemetry' })
  @ApiResponse({ status: 201, description: 'Telemetry received' })
  receiveTelemetry(@Body() dto: TelemetryDto) {
    return this.evalsService.receiveTelemetry(dto);
  }

  @Post('run')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Run an eval comparing two prompt versions' })
  @ApiResponse({ status: 201, description: 'Eval completed successfully' })
  runEval(
    @Request() req: { user: { userId: string } },
    @Body() dto: RunEvalDto,
  ) {
    return this.evalsService.runEval(req.user.userId, dto);
  }

  @Get('analytics/global')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get global analytics across all prompts' })
  @ApiResponse({ status: 200, description: 'Global analytics returned' })
  getGlobalAnalytics(@Request() req: { user: { userId: string } }) {
    return this.evalsService.getGlobalAnalytics(req.user.userId);
  }

  @Get('analytics/:promptId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get analytics for a specific prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Analytics returned' })
  getAnalytics(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.evalsService.getAnalytics(req.user.userId, promptId);
  }

  @Get('comparisons/:promptId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get A/B comparison history for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Comparison history returned' })
  getComparisons(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.evalsService.getComparisons(req.user.userId, promptId);
  }

  @Get('prompt/:promptId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get eval history for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Eval history returned' })
  getHistory(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.evalsService.getHistory(req.user.userId, promptId);
  }

  @Get('run/:runId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single eval run' })
  @ApiParam({ name: 'runId', description: 'Eval Run ID' })
  @ApiResponse({ status: 200, description: 'Eval run returned' })
  getRunById(
    @Request() req: { user: { userId: string } },
    @Param('runId') runId: string,
  ) {
    return this.evalsService.getRunById(req.user.userId, runId);
  }
}
