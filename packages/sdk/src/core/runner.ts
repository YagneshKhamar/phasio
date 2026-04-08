import type {
  ProviderConfig,
  PromptVersion,
  TestDefinition,
  CaseResult,
  VersionResult,
  HookFn,
  JudgeScore,
} from '../types';
import { resolveExpect, type ResolvedExpect } from './validators';
import { callLlm, callLlmJudge } from './llm';

const MAX_CONCURRENT_LLM_CALLS = 5;

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= tasks.length) return;
    results[current] = await tasks[current]!();
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, runNext),
  );
  return results;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export async function runHooks(hooks: HookFn[]): Promise<void> {
  for (const hook of hooks) {
    await Promise.resolve(hook());
  }
}

// ─── Single expect evaluation ─────────────────────────────────────────────────

async function evaluateExpect(
  output: string,
  resolved: ResolvedExpect,
  judgeProviders: ProviderConfig[],
): Promise<{ passed: boolean; score?: number; reason?: string; judgeScores?: JudgeScore[]; desc?: string }> {
  if (resolved.kind === 'fn') {
    const passed = await Promise.resolve(resolved.fn(output));
    return { passed, desc: resolved.desc };
  }

  // Both llm_judge and natural_language route through the same judge
  const result = await callLlmJudge(output, resolved.criteria, judgeProviders);
  return {
    passed: result.passed,
    score: result.score,
    reason: result.reason,
    judgeScores: result.judgeScores,
    desc: resolved.kind === 'llm_judge'
      ? `llm_judge: ${resolved.criteria}`
      : resolved.criteria,
  };
}

// ─── Run a single test on a single version+provider ──────────────────────────

export async function runTestOnVersion(
  test: TestDefinition,
  version: PromptVersion,
  provider: ProviderConfig,
  judgeProviders: ProviderConfig[],
  rules: string[],
): Promise<CaseResult> {
  const prompt = version.template.replace('{{input}}', test.input);
  const { output, latencyMs } = await callLlm(prompt, provider);

  // Resolve test expect(s) into array of resolved validators
  const resolvedExpects = resolveExpect(test.expect);

  // Add suite-level rules as natural_language expects
  const ruleExpects: ResolvedExpect[] = rules.map((r) => ({
    kind: 'natural_language' as const,
    criteria: r,
  }));

  const allExpects = [...resolvedExpects, ...ruleExpects];

  // Evaluate all expects — ALL must pass
  const evalResults = await Promise.all(
    allExpects.map((resolved) => evaluateExpect(output, resolved, judgeProviders)),
  );

  const passed = evalResults.every((r) => r.passed);

  // For display: use the first judge result's score/reason
  const judgeResult = evalResults.find((r) => r.score !== undefined);
  const failedExpect = evalResults.find((r) => !r.passed);

  // Build description for terminal output
  const expectDescription = failedExpect?.desc ?? evalResults[0]?.desc;

  return {
    name: test.name,
    input: test.input,
    passed,
    output,
    latencyMs,
    score: judgeResult?.score,
    reason: judgeResult?.reason,
    expectDescription,
    judgeScores: judgeResult?.judgeScores,
  };
}

// ─── Run a test across all (version × provider) combinations ─────────────────

export async function runTestAcrossVersions(
  test: TestDefinition,
  versions: PromptVersion[],
  providers: ProviderConfig[],
  judgeProviders: ProviderConfig[],
  rules: string[],
  concurrency: number = MAX_CONCURRENT_LLM_CALLS,
): Promise<VersionResult[]> {
  const versionResults: VersionResult[] = [];

  for (const provider of providers) {
    for (const version of versions) {
      const tasks = [
        () => runTestOnVersion(test, version, provider, judgeProviders, rules),
      ];
      const [result] = await runWithConcurrency(tasks, concurrency);

      const existing = versionResults.find(
        (v) => v.label === version.label && v.provider === provider.provider,
      );

      if (existing) {
        existing.results.push(result!);
        existing.totalCases++;
        if (result!.passed) existing.passedCases++;
        existing.score = (existing.passedCases / existing.totalCases) * 100;
        existing.avgLatencyMs = Math.round(
          existing.results.reduce((s, r) => s + r.latencyMs, 0) / existing.results.length,
        );
      } else {
        versionResults.push({
          label: version.label,
          provider: provider.provider,
          model: provider.model,
          score: result!.passed ? 100 : 0,
          passedCases: result!.passed ? 1 : 0,
          totalCases: 1,
          avgLatencyMs: result!.latencyMs,
          results: [result!],
        });
      }
    }
  }

  return versionResults;
}
