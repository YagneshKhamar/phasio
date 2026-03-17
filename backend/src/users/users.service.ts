import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        openaiApiKey: true,
        anthropicApiKey: true,
        preferredProvider: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      openaiApiKey: user.openaiApiKey
        ? `sk-...${user.openaiApiKey.slice(-4)}`
        : null,
      anthropicApiKey: user.anthropicApiKey
        ? `sk-ant-...${user.anthropicApiKey.slice(-4)}`
        : null,
      hasOpenaiKey: !!user.openaiApiKey,
      hasAnthropicKey: !!user.anthropicApiKey,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.openaiApiKey && { openaiApiKey: dto.openaiApiKey }),
        ...(dto.anthropicApiKey && { anthropicApiKey: dto.anthropicApiKey }),
        ...(dto.preferredProvider && {
          preferredProvider: dto.preferredProvider,
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        preferredProvider: true,
      },
    });
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatch = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
