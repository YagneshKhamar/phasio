import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunEvalDto } from './dto/run-eval.dto';
import { runRuleBasedCheck } from './runners/rule-based.runner';
import { runLlmJudge } from './runners/llm-judge.runner';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type EvalResult = {
  testCaseId: string;
  input: string;
  output: string;
  passed: boolean;
  score: number | null;
  reason: string | null;
  latencyMs: number;
};

// Run promises in batches to avoid hammering rate limits
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= tasks.length) return;
    results[current] = await tasks[current]();
    await runNext();
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    runNext,
  );
  await Promise.all(workers);
  return results;
}

@Injectable()
export class EvalsService {
  constructor(private readonly prisma: PrismaService) {}

  async runEval(userId: string, dto: RunEvalDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        openaiApiKey: true,
        anthropicApiKey: true,
        preferredProvider: true,
      },
    });

    const provider = (user?.preferredProvider ?? 'openai') as
      | 'openai'
      | 'anthropic';

    if (provider === 'openai' && !user?.openaiApiKey) {
      throw new BadRequestException(
        'No OpenAI API key found — add one in Settings',
      );
    }
    if (provider === 'anthropic' && !user?.anthropicApiKey) {
      throw new BadRequestException(
        'No Anthropic API key found — add one in Settings',
      );
    }

    const apiKey =
      provider === 'openai' ? user!.openaiApiKey! : user!.anthropicApiKey!;

    const versionA = await this.prisma.promptVersion.findUnique({
      where: { id: dto.versionAId },
      include: { prompt: { include: { project: true } } },
    });

    const versionB = await this.prisma.promptVersion.findUnique({
      where: { id: dto.versionBId },
      include: { prompt: { include: { project: true } } },
    });

    if (!versionA || !versionB)
      throw new NotFoundException('One or both versions not found');
    if (versionA.prompt.project.userId !== userId)
      throw new ForbiddenException('Access denied');

    const suite = await this.prisma.testSuite.findUnique({
      where: { id: dto.suiteId },
      include: { cases: true },
    });

    if (!suite) throw new NotFoundException('Test suite not found');

    const [runA, runB] = await Promise.all([
      this.executeRun(versionA.id, versionA.template, suite, apiKey, provider),
      this.executeRun(versionB.id, versionB.template, suite, apiKey, provider),
    ]);

    // Determine winner
    let winner: string;
    if (runA.score > runB.score) winner = 'A';
    else if (runB.score > runA.score) winner = 'B';
    else winner = 'tie';

    // Save comparison linking both runs
    await this.prisma.evalComparison.create({
      data: {
        promptId: versionA.promptId,
        suiteId: suite.id,
        runAId: runA.evalRunId,
        runBId: runB.evalRunId,
        winner,
      },
    });

    return {
      versionA: { id: versionA.id, version: versionA.version, ...runA },
      versionB: { id: versionB.id, version: versionB.version, ...runB },
      winner,
    };
  }

  private async executeRun(
    promptVersionId: string,
    template: string,
    suite: {
      id: string;
      cases: {
        id: string;
        input: string;
        checkType: string;
        checkValue: string;
      }[];
    },
    apiKey: string,
    provider: 'openai' | 'anthropic',
  ) {
    // Build one task per test case
    const tasks = suite.cases.map(
      (testCase) => async (): Promise<EvalResult> => {
        const prompt = template.replace('{{input}}', testCase.input);
        const start = Date.now();
        let output = '';

        try {
          if (provider === 'anthropic') {
            const client = new Anthropic({ apiKey });
            const response = await client.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              messages: [{ role: 'user', content: prompt }],
            });
            const block = response.content[0];
            output = block.type === 'text' ? block.text : '';
          } else {
            const client = new OpenAI({ apiKey });
            const response = await client.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0,
            });
            output = response.choices[0]?.message?.content ?? '';
          }
        } catch (err: unknown) {
          const error = err as { status?: number; message?: string };
          if (error.status === 401) {
            throw new Error(`Invalid ${provider} API key`);
          }
          if (error.status === 429) {
            throw new Error(`${provider} quota exceeded — check your billing`);
          }
          throw new Error(
            `${provider} error: ${error.message ?? 'Unknown error'}`,
          );
        }

        const latencyMs = Date.now() - start;

        let passed = false;
        let score: number | null = null;
        let reason: string | null = null;

        if (
          ['contains', 'not_contains', 'regex'].includes(testCase.checkType)
        ) {
          passed = runRuleBasedCheck(
            output,
            testCase.checkValue,
            testCase.checkType,
          );
        } else if (testCase.checkType === 'llm_judge') {
          const judgeResult = await runLlmJudge(
            output,
            testCase.checkValue,
            apiKey,
            provider,
          );
          passed = judgeResult.passed;
          score = judgeResult.score;
          reason = judgeResult.reason;
        }

        return {
          testCaseId: testCase.id,
          input: testCase.input,
          output,
          passed,
          score,
          reason,
          latencyMs,
        };
      },
    );

    // Max 5 concurrent LLM calls per run to respect rate limits
    const results = await runWithConcurrency(tasks, 5);

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const evalScore = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    const evalRun = await this.prisma.evalRun.create({
      data: {
        promptVersionId,
        suiteId: suite.id,
        score: evalScore,
        totalCases: totalCount,
        passedCases: passedCount,
        results: {
          create: results.map((r) => ({
            testCaseId: r.testCaseId,
            passed: r.passed,
            output: r.output,
            score: r.score,
            reason: r.reason,
            latencyMs: r.latencyMs,
          })),
        },
      },
      include: { results: true },
    });

    return {
      evalRunId: evalRun.id,
      score: evalScore,
      passedCases: passedCount,
      totalCases: totalCount,
      results,
    };
  }

  async getHistory(userId: string, promptId: string) {
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

    return this.prisma.evalRun.findMany({
      where: {
        promptVersion: { promptId },
      },
      include: {
        promptVersion: true,
        results: {
          include: { testCase: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getComparisons(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: { project: true },
    });

    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.project.userId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.evalComparison.findMany({
      where: { promptId },
      include: {
        runA: {
          include: {
            promptVersion: true,
            results: { include: { testCase: true } },
          },
        },
        runB: {
          include: {
            promptVersion: true,
            results: { include: { testCase: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRunById(userId: string, runId: string) {
    const run = await this.prisma.evalRun.findUnique({
      where: { id: runId },
      include: {
        promptVersion: {
          include: {
            prompt: { include: { project: true } },
          },
        },
        results: {
          include: { testCase: true },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Eval run not found');
    }

    if (run.promptVersion.prompt.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return run;
  }
}
