import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyPromptOwnership(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: { project: true },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    if (prompt.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return prompt;
  }

  async findAll(userId: string, promptId: string) {
    await this.verifyPromptOwnership(userId, promptId);

    return this.prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(userId: string, promptId: string, versionId: string) {
    await this.verifyPromptOwnership(userId, promptId);

    const version = await this.prisma.promptVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  async create(userId: string, promptId: string, dto: CreateVersionDto) {
    await this.verifyPromptOwnership(userId, promptId);

    if (!dto.template.includes('{{input}}')) {
      throw new BadRequestException('Template must contain {{input}} variable');
    }

    const latest = await this.prisma.promptVersion.findFirst({
      where: { promptId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latest ? latest.version + 1 : 1;

    return this.prisma.promptVersion.create({
      data: {
        version: nextVersion,
        template: dto.template,
        promptId,
      },
    });
  }
}
