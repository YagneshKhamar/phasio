import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSuiteDto } from './dto/create-suite.dto';
import { CreateTestCaseDto } from './dto/create-test-case.dto';

@Injectable()
export class SuitesService {
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

  private async verifySuiteOwnership(userId: string, suiteId: string) {
    const suite = await this.prisma.testSuite.findUnique({
      where: { id: suiteId },
      include: { prompt: { include: { project: true } } },
    });

    if (!suite) {
      throw new NotFoundException('Suite not found');
    }

    if (suite.prompt.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return suite;
  }

  async findAll(userId: string, promptId: string) {
    await this.verifyPromptOwnership(userId, promptId);

    return this.prisma.testSuite.findMany({
      where: { promptId },
      include: { cases: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSuite(userId: string, promptId: string, dto: CreateSuiteDto) {
    await this.verifyPromptOwnership(userId, promptId);

    return this.prisma.testSuite.create({
      data: {
        name: dto.name,
        promptId,
      },
    });
  }

  async deleteSuite(userId: string, suiteId: string) {
    await this.verifySuiteOwnership(userId, suiteId);

    return this.prisma.testSuite.delete({
      where: { id: suiteId },
    });
  }

  async createTestCase(
    userId: string,
    suiteId: string,
    dto: CreateTestCaseDto,
  ) {
    await this.verifySuiteOwnership(userId, suiteId);

    return this.prisma.testCase.create({
      data: {
        input: dto.input,
        checkType: dto.checkType,
        checkValue: dto.checkValue,
        suiteId,
      },
    });
  }

  async deleteTestCase(userId: string, suiteId: string, caseId: string) {
    await this.verifySuiteOwnership(userId, suiteId);

    const testCase = await this.prisma.testCase.findUnique({
      where: { id: caseId },
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    return this.prisma.testCase.delete({
      where: { id: caseId },
    });
  }
}
