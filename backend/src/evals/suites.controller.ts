import {
  Controller,
  Get,
  Post,
  Delete,
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
import { SuitesService } from './suites.service';
import { CreateSuiteDto } from './dto/create-suite.dto';
import { CreateTestCaseDto } from './dto/create-test-case.dto';

@ApiTags('Test Suites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suites')
export class SuitesController {
  constructor(private readonly suitesService: SuitesService) {}

  @Get('prompt/:promptId')
  @ApiOperation({ summary: 'Get all test suites for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'List of suites returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  findAll(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.suitesService.findAll(req.user.userId, promptId);
  }

  @Post('prompt/:promptId')
  @ApiOperation({ summary: 'Create a test suite for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 201, description: 'Suite created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  createSuite(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
    @Body() dto: CreateSuiteDto,
  ) {
    return this.suitesService.createSuite(req.user.userId, promptId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test suite' })
  @ApiParam({ name: 'id', description: 'Suite ID' })
  @ApiResponse({ status: 200, description: 'Suite deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Suite not found' })
  deleteSuite(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.suitesService.deleteSuite(req.user.userId, id);
  }

  @Post(':suiteId/cases')
  @ApiOperation({ summary: 'Add a test case to a suite' })
  @ApiParam({ name: 'suiteId', description: 'Suite ID' })
  @ApiResponse({ status: 201, description: 'Test case created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Suite not found' })
  createTestCase(
    @Request() req: { user: { userId: string } },
    @Param('suiteId') suiteId: string,
    @Body() dto: CreateTestCaseDto,
  ) {
    return this.suitesService.createTestCase(req.user.userId, suiteId, dto);
  }

  @Delete(':suiteId/cases/:caseId')
  @ApiOperation({ summary: 'Delete a test case' })
  @ApiParam({ name: 'suiteId', description: 'Suite ID' })
  @ApiParam({ name: 'caseId', description: 'Test Case ID' })
  @ApiResponse({ status: 200, description: 'Test case deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  deleteTestCase(
    @Request() req: { user: { userId: string } },
    @Param('suiteId') suiteId: string,
    @Param('caseId') caseId: string,
  ) {
    return this.suitesService.deleteTestCase(req.user.userId, suiteId, caseId);
  }
}
