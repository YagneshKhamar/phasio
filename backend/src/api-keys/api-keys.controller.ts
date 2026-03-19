import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ValidateApiKeyDto } from './dto/validate-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // Protected: create a key (web dashboard)
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate a new Phasio API key' })
  @ApiResponse({ status: 201, description: 'Key generated — shown once only' })
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(req.user.userId, dto);
  }

  // Protected: list keys (web dashboard)
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, description: 'Keys returned (masked)' })
  findAll(@Request() req: { user: { userId: string } }) {
    return this.apiKeysService.findAll(req.user.userId);
  }

  // Protected: revoke a key
  @Patch(':id/revoke')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: 200, description: 'Key revoked' })
  revoke(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.apiKeysService.revoke(req.user.userId, id);
  }

  // Protected: delete a key permanently
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete an API key permanently' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: 200, description: 'Key deleted' })
  delete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.apiKeysService.delete(req.user.userId, id);
  }

  // Public: validate a key — called by the SDK
  @Post('validate')
  @ApiOperation({ summary: 'Validate a PromptEval API key (SDK use only)' })
  @ApiResponse({ status: 200, description: 'Key is valid' })
  @ApiResponse({ status: 401, description: 'Key is invalid or revoked' })
  validate(@Body() dto: ValidateApiKeyDto) {
    return this.apiKeysService.validate(dto.key);
  }
}
