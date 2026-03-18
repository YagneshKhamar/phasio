import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate a new API key — key is shown ONCE, only hash stored
  async create(userId: string, dto: CreateApiKeyDto) {
    const rawKey = `pe-${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10); // "pe-" + 7 chars for display

    await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        keyHash,
        keyPrefix,
      },
    });

    // Return the raw key ONCE — never stored, never retrievable again
    return {
      key: rawKey,
      prefix: keyPrefix,
      name: dto.name,
      message: 'Save this key — it will not be shown again.',
    };
  }

  // List all keys for a user — masked, never raw
  async findAll(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        usageCount: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      ...k,
      displayKey: `${k.keyPrefix}${'•'.repeat(20)}`,
    }));
  }

  // Revoke a key
  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
  }

  // Delete a key permanently
  async delete(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.apiKey.delete({ where: { id: keyId } });
  }

  // Validate a key — called by the SDK on every run
  async validate(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            openaiModel: true,
            anthropicModel: true,
          },
        },
      },
    });

    if (!key) throw new UnauthorizedException('Invalid API key');
    if (!key.isActive)
      throw new UnauthorizedException('API key has been revoked');

    // Update usage stats
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return {
      valid: true,
      userId: key.user.id,
      openaiModel: key.user.openaiModel,
      anthropicModel: key.user.anthropicModel,
    };
  }
}
