import type {
  ProviderConfig,
  PromptVersion,
  TestCase,
  CaseResult,
  VersionResult,
  ProviderRunResult,
} from "./types";
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

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    runNext,
  );
  await Promise.all(workers);
  return results;
}

async function runVersion(
  version: PromptVersion,
  tests: TestCase[],
  config: ProviderConfig,
  concurrency: number,
): Promise<VersionResult> {
  const tasks = tests.map((testCase) => async (): Promise<CaseResult> => {
    if (!version.template.includes("{{input}}")) {
      throw new Error(
        `Version "${version.label}" template must contain {{input}}`,
      );
    }

    const prompt = version.template.replace("{{input}}", testCase.input);
    const { output, latencyMs } = await callLlm(prompt, config);

    const resolved = resolveExpect(testCase.expect);

    let passed = false;
    let score: number | undefined;
    let reason: string | undefined;
    let expectDescription: string | undefined;

    if (resolved.kind === "llm_judge") {
      const judgeResult = await callLlmJudge(output, resolved.criteria, config);
      passed = judgeResult.passed;
      score = judgeResult.score;
      reason = judgeResult.reason;
      expectDescription = `llm_judge: ${resolved.criteria}`;
    } else {
      passed = await Promise.resolve(resolved.fn(output));
      expectDescription = resolved.desc;
    }

    return {
      input: testCase.input,
      label: testCase.label,
      passed,
      output,
      latencyMs,
      score,
      reason,
      expectDescription,
    };
  });

  const results = await runWithConcurrency(tasks, concurrency);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const avgLatencyMs =
    totalCount > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.latencyMs, 0) / totalCount,
        )
      : 0;

  return {
    label: version.label,
    provider: config.provider,
    model: config.model,
    score: totalCount > 0 ? (passedCount / totalCount) * 100 : 0,
    passedCases: passedCount,
    totalCases: totalCount,
    avgLatencyMs,
    results,
  };
}

export async function runForProvider(
  versions: PromptVersion[],
  tests: TestCase[],
  config: ProviderConfig,
  concurrency: number,
): Promise<ProviderRunResult> {
  const versionResults = await Promise.all(
    versions.map((v) => runVersion(v, tests, config, concurrency)),
  );

  // Winner by score, tiebreak by latency
  const sorted = [...versionResults].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.avgLatencyMs - b.avgLatencyMs;
  });

  const winner = sorted[0].label;
  const fastest = [...versionResults].sort(
    (a, b) => a.avgLatencyMs - b.avgLatencyMs,
  )[0].label;

  return {
    provider: config.provider,
    model: config.model,
    versions: versionResults,
    winner,
    fastest,
  };
}
