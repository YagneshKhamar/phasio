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
        openaiModel: true,
        anthropicModel: true,
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
    const model =
      provider === 'openai'
        ? user!.openaiModel || 'gpt-4o-mini'
        : user!.anthropicModel || 'claude-haiku-4-5-20251001';

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
      this.executeRun(
        versionA.id,
        versionA.template,
        suite,
        apiKey,
        provider,
        model,
        'web',
      ),
      this.executeRun(
        versionB.id,
        versionB.template,
        suite,
        apiKey,
        provider,
        model,
        'web',
      ),
    ]);

    let winner: string;
    if (runA.score > runB.score) winner = 'A';
    else if (runB.score > runA.score) winner = 'B';
    else winner = 'tie';

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
    model: string,
    source: 'web' | 'sdk',
  ) {
    const tasks = suite.cases.map(
      (testCase) => async (): Promise<EvalResult> => {
        const prompt = template.replace('{{input}}', testCase.input);
        const start = Date.now();
        let output = '';

        try {
          if (provider === 'anthropic') {
            const client = new Anthropic({ apiKey });
            const response = await client.messages.create({
              model,
              max_tokens: 1024,
              messages: [{ role: 'user', content: prompt }],
            });
            const block = response.content[0];
            output = block.type === 'text' ? block.text : '';
          } else {
            const client = new OpenAI({ apiKey });
            const response = await client.chat.completions.create({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0,
            });
            output = response.choices[0]?.message?.content ?? '';
          }
        } catch (err: unknown) {
          const error = err as { status?: number; message?: string };
          if (error.status === 401)
            throw new Error(`Invalid ${provider} API key`);
          if (error.status === 429)
            throw new Error(`${provider} quota exceeded — check your billing`);
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
            model,
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
        provider,
        model,
        source,
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

  async getHistory(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: { project: true },
    });

    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.project.userId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.evalRun.findMany({
      where: { promptVersion: { promptId } },
      include: {
        promptVersion: true,
        results: { include: { testCase: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRunById(userId: string, runId: string) {
    const run = await this.prisma.evalRun.findUnique({
      where: { id: runId },
      include: {
        promptVersion: {
          include: { prompt: { include: { project: true } } },
        },
        results: { include: { testCase: true } },
      },
    });

    if (!run) throw new NotFoundException('Eval run not found');
    if (run.promptVersion.prompt.project.userId !== userId)
      throw new ForbiddenException('Access denied');

    return run;
  }

  async getAnalytics(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: { project: true },
    });

    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.project.userId !== userId)
      throw new ForbiddenException('Access denied');

    const runs = await this.prisma.evalRun.findMany({
      where: { promptVersion: { promptId } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        score: true,
        passedCases: true,
        totalCases: true,
        provider: true,
        model: true,
        source: true,
        createdAt: true,
        promptVersion: { select: { version: true } },
      },
    });

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        trend: [],
        providerBreakdown: [],
        sourceBreakdown: { web: 0, sdk: 0 },
        regression: null,
        avgLatency: null,
      };
    }

    const trend = runs.map((r) => ({
      date: r.createdAt,
      score: r.score,
      version: r.promptVersion.version,
      provider: r.provider,
      source: r.source,
    }));

    // Provider breakdown
    const providerMap: Record<string, { scores: number[]; model: string }> = {};
    for (const r of runs) {
      if (!providerMap[r.provider]) {
        providerMap[r.provider] = { scores: [], model: r.model };
      }
      providerMap[r.provider].scores.push(r.score);
    }
    const providerBreakdown = Object.entries(providerMap).map(
      ([provider, data]) => ({
        provider,
        model: data.model,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        runs: data.scores.length,
      }),
    );

    const sourceBreakdown = {
      web: runs.filter((r) => r.source === 'web').length,
      sdk: runs.filter((r) => r.source === 'sdk').length,
    };

    // Regression detection
    let regression: {
      lastScore: number;
      prevScore: number;
      delta: number;
      status: string;
    } | null = null;
    if (runs.length >= 2) {
      const last = runs[runs.length - 1];
      const prev = runs[runs.length - 2];
      const delta = last.score - prev.score;
      regression = {
        lastScore: last.score,
        prevScore: prev.score,
        delta: Math.round(delta * 10) / 10,
        status:
          delta < -10 ? 'regression' : delta > 10 ? 'improvement' : 'stable',
      };
    }

    const latencyData = await this.prisma.evalResult.aggregate({
      where: { evalRun: { promptVersion: { promptId } } },
      _avg: { latencyMs: true },
    });

    return {
      totalRuns: runs.length,
      trend,
      providerBreakdown,
      sourceBreakdown,
      regression,
      avgLatency: latencyData._avg.latencyMs
        ? Math.round(latencyData._avg.latencyMs)
        : null,
    };
  }

  async getGlobalAnalytics(userId: string) {
    // All runs across all prompts for this user
    const runs = await this.prisma.evalRun.findMany({
      where: { promptVersion: { prompt: { project: { userId } } } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        score: true,
        passedCases: true,
        totalCases: true,
        provider: true,
        model: true,
        source: true,
        createdAt: true,
        promptVersion: {
          select: {
            version: true,
            prompt: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        avgScore: null,
        avgLatency: null,
        sourceBreakdown: { web: 0, sdk: 0 },
        providerBreakdown: [],
        trend: [],
        topPrompts: [],
        regressingPrompts: [],
      };
    }

    const avgScore = runs.reduce((sum, r) => sum + r.score, 0) / runs.length;

    // Provider breakdown
    const providerMap: Record<string, { scores: number[]; model: string }> = {};
    for (const r of runs) {
      if (!providerMap[r.provider]) {
        providerMap[r.provider] = { scores: [], model: r.model };
      }
      providerMap[r.provider].scores.push(r.score);
    }
    const providerBreakdown = Object.entries(providerMap).map(
      ([provider, data]) => ({
        provider,
        model: data.model,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        runs: data.scores.length,
      }),
    );

    // Score trend — last 30 runs
    const trend = runs.slice(-30).map((r) => ({
      date: r.createdAt,
      score: r.score,
      provider: r.provider,
      source: r.source,
      promptName: r.promptVersion.prompt.name,
    }));

    // Source breakdown
    const sourceBreakdown = {
      web: runs.filter((r) => r.source === 'web').length,
      sdk: runs.filter((r) => r.source === 'sdk').length,
    };

    // Per-prompt stats
    const promptMap: Record<string, { name: string; runs: typeof runs }> = {};
    for (const r of runs) {
      const pid = r.promptVersion.prompt.id;
      if (!promptMap[pid]) {
        promptMap[pid] = { name: r.promptVersion.prompt.name, runs: [] };
      }
      promptMap[pid].runs.push(r);
    }

    // Top prompts by avg score
    const topPrompts = Object.entries(promptMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalRuns: data.runs.length,
        avgScore: data.runs.reduce((s, r) => s + r.score, 0) / data.runs.length,
        lastRun: data.runs[data.runs.length - 1].createdAt,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    // Regressing prompts — last run dropped > 10% vs previous
    const regressingPrompts = Object.entries(promptMap)
      .filter(([, data]) => data.runs.length >= 2)
      .map(([id, data]) => {
        const last = data.runs[data.runs.length - 1];
        const prev = data.runs[data.runs.length - 2];
        const delta = last.score - prev.score;
        return { id, name: data.name, delta, lastScore: last.score };
      })
      .filter((p) => p.delta < -10)
      .sort((a, b) => a.delta - b.delta);

    // Global avg latency
    const latencyData = await this.prisma.evalResult.aggregate({
      where: {
        evalRun: {
          promptVersion: { prompt: { project: { userId } } },
        },
      },
      _avg: { latencyMs: true },
    });

    return {
      totalRuns: runs.length,
      avgScore: Math.round(avgScore * 10) / 10,
      avgLatency: latencyData._avg.latencyMs
        ? Math.round(latencyData._avg.latencyMs)
        : null,
      sourceBreakdown,
      providerBreakdown,
      trend,
      topPrompts,
      regressingPrompts,
    };
  }
}
