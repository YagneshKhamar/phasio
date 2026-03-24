import type {
  ProviderConfig,
  PromptVersion,
  TestDefinition,
  CaseResult,
  VersionResult,
  HookFn,
} from "../types";
import { resolveExpect } from "./validators";
import { callLlm, callLlmJudge } from "./llm";

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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, runNext),
  );
  return results;
}

export async function runHooks(hooks: HookFn[]): Promise<void> {
  for (const hook of hooks) {
    await Promise.resolve(hook());
  }
}

export async function runTestOnVersion(
  test: TestDefinition,
  version: PromptVersion,
  provider: ProviderConfig,
  judgeProviders: ProviderConfig[],
): Promise<CaseResult> {
  const prompt = version.template.replace("{{input}}", test.input);
  const { output, latencyMs } = await callLlm(prompt, provider);
  const resolved = resolveExpect(test.expect);

  let passed = false;
  let score: number | undefined;
  let reason: string | undefined;
  let expectDescription: string | undefined;
  let judgeScores: import("../types").JudgeScore[] | undefined;

  if (resolved.kind === "llm_judge") {
    const judgeResult = await callLlmJudge(
      output,
      resolved.criteria,
      judgeProviders,
    );
    passed = judgeResult.passed;
    score = judgeResult.score;
    reason = judgeResult.reason;
    judgeScores = judgeResult.judgeScores;
    expectDescription = `llm_judge: ${resolved.criteria}`;
  } else {
    passed = await Promise.resolve(resolved.fn(output));
    expectDescription = resolved.desc;
  }

  return {
    name: test.name,
    input: test.input,
    passed,
    output,
    latencyMs,
    score,
    reason,
    expectDescription,
    judgeScores,
  };
}

export async function runTestAcrossVersions(
  test: TestDefinition,
  versions: PromptVersion[],
  providers: ProviderConfig[],
  judgeProviders: ProviderConfig[],
  concurrency: number,
): Promise<VersionResult[]> {
  const versionResults: VersionResult[] = [];

  for (const provider of providers) {
    for (const version of versions) {
      const tasks = [
        () => runTestOnVersion(test, version, provider, judgeProviders),
      ];
      const [result] = await runWithConcurrency(tasks, concurrency);

      const existing = versionResults.find(
        (v) => v.label === version.label && v.provider === provider.provider,
      );

      if (existing) {
        existing.results.push(result);
        existing.totalCases++;
        if (result.passed) existing.passedCases++;
        existing.score = (existing.passedCases / existing.totalCases) * 100;
        existing.avgLatencyMs = Math.round(
          existing.results.reduce((s, r) => s + r.latencyMs, 0) /
            existing.results.length,
        );
      } else {
        versionResults.push({
          label: version.label,
          provider: provider.provider,
          model: provider.model,
          score: result.passed ? 100 : 0,
          passedCases: result.passed ? 1 : 0,
          totalCases: 1,
          avgLatencyMs: result.latencyMs,
          results: [result],
        });
      }
    }
  }

  return versionResults;
}
