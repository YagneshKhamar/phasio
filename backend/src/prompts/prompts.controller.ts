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
import { PromptsService } from './prompts.service';
import { CreatePromptDto } from './dto/create-prompt.dto';

@ApiTags('Prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all prompts in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of prompts returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findAll(
    @Request() req: { user: { userId: string } },
    @Param('projectId') projectId: string,
  ) {
    return this.promptsService.findAllByProject(req.user.userId, projectId);
  }

  @Post('project/:projectId')
  @ApiOperation({ summary: 'Create a prompt in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Prompt created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  create(
    @Request() req: { user: { userId: string } },
    @Param('projectId') projectId: string,
    @Body() dto: CreatePromptDto,
  ) {
    return this.promptsService.create(req.user.userId, projectId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single prompt with versions and suites' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Prompt returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  findOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.promptsService.findOne(req.user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a prompt' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  @ApiResponse({ status: 200, description: 'Prompt deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  delete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.promptsService.delete(req.user.userId, id);
  }
}
