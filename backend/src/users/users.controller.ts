import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  getProfile(@Request() req: { user: { userId: string } }) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings and API key' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  updateSettings(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(req.user.userId, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Update password' })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  updatePassword(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(req.user.userId, dto);
  }
}
