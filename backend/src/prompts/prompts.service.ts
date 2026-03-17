import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromptDto } from './dto/create-prompt.dto';

@Injectable()
export class PromptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, projectId: string, dto: CreatePromptDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!dto.template.includes('{{input}}')) {
      throw new BadRequestException('Template must contain {{input}} variable');
    }

    const prompt = await this.prisma.prompt.create({
      data: {
        name: dto.name,
        projectId,
      },
    });

    await this.prisma.promptVersion.create({
      data: {
        version: 1,
        template: dto.template,
        promptId: prompt.id,
      },
    });

    return this.prisma.prompt.findUnique({
      where: { id: prompt.id },
      include: { versions: true },
    });
  }

  async findOne(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        versions: { orderBy: { version: 'desc' } },
        suites: {
          include: {
            cases: true,
          },
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: prompt.projectId },
    });

    if (project?.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return prompt;
  }

  async delete(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: prompt.projectId },
    });

    if (project?.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.prompt.delete({
      where: { id: promptId },
    });
  }
}
