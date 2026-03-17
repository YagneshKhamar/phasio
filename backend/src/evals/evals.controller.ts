import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvalsService } from './evals.service';
import { RunEvalDto } from './dto/run-eval.dto';

@ApiTags('Evals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evals')
export class EvalsController {
  constructor(private readonly evalsService: EvalsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run an eval comparing two prompt versions' })
  @ApiResponse({ status: 201, description: 'Eval completed successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Version or suite not found' })
  runEval(
    @Request() req: { user: { userId: string } },
    @Body() dto: RunEvalDto,
  ) {
    return this.evalsService.runEval(req.user.userId, dto);
  }

  @Get('prompt/:promptId')
  @ApiOperation({ summary: 'Get eval history for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Eval history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  getHistory(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.evalsService.getHistory(req.user.userId, promptId);
  }

  @Get('run/:runId')
  @ApiOperation({ summary: 'Get a single eval run with full results' })
  @ApiParam({ name: 'runId', description: 'Eval Run ID' })
  @ApiResponse({ status: 200, description: 'Eval run returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Eval run not found' })
  getRunById(
    @Request() req: { user: { userId: string } },
    @Param('runId') runId: string,
  ) {
    return this.evalsService.getRunById(req.user.userId, runId);
  }
}
