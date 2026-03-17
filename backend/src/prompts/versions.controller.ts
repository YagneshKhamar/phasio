import {
  Controller,
  Get,
  Post,
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
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';

@ApiTags('Prompt Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts/:promptId/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all versions of a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'List of versions returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  findAll(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
  ) {
    return this.versionsService.findAll(req.user.userId, promptId);
  }

  @Get(':versionId')
  @ApiOperation({ summary: 'Get a single version' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({ status: 200, description: 'Version returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  findOne(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionsService.findOne(req.user.userId, promptId, versionId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new version to a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  create(
    @Request() req: { user: { userId: string } },
    @Param('promptId') promptId: string,
    @Body() dto: CreateVersionDto,
  ) {
    return this.versionsService.create(req.user.userId, promptId, dto);
  }
}
