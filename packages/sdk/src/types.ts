export type Provider = "openai" | "anthropic";

export interface ProviderConfig {
  provider: Provider;
  llmKey: string;
  model: string;
}

export type CheckType = "contains" | "not_contains" | "regex" | "llm_judge";

export type ExpectFn = (output: string) => boolean | Promise<boolean>;

export type Expect =
  | string // shorthand: "contains:foo" | "not_contains:foo" | "regex:pattern"
  | RegExp // regex match
  | ExpectFn // custom function
  | { type: "llm_judge"; criteria: string }; // LLM judge

export interface TestCase {
  input: string;
  expect: Expect;
  label?: string; // optional display label
}

export interface PromptVersion {
  label: string; // e.g. "v1", "v2", "baseline"
  template: string; // must contain {{input}}
}

export interface RunOptions {
  versions: PromptVersion[];
  tests: TestCase[];
  concurrency?: number; // default: 5
}

export interface CaseResult {
  input: string;
  label?: string;
  passed: boolean;
  output: string;
  latencyMs: number;
  score?: number;
  reason?: string;
  expectDescription?: string; // human readable description of the check
}

export interface VersionResult {
  label: string;
  provider: string;
  model: string;
  score: number; // percentage 0–100
  passedCases: number;
  totalCases: number;
  avgLatencyMs: number;
  results: CaseResult[];
}

export interface ProviderRunResult {
  provider: string;
  model: string;
  versions: VersionResult[];
  winner: string; // version label
  fastest: string; // version label by avg latency
}

export interface ReportStatus {
  passed: boolean;
  reason: string; // e.g. "all cases passed" | "score 62.5% below threshold 80%"
}

export interface CompareResult {
  providers: ProviderRunResult[];
  summary: {
    bestProvider: string;
    bestVersion: string;
    overallScore: number; // avg score across all versions and providers
    report: ReportStatus; // pass/fail with reason
  };
}

export interface PhasioConfig {
  apiKey: string;
  providers: ProviderConfig | ProviderConfig[];
  baseUrl?: string;
  telemetry?: boolean;
  // Threshold config — global, applies to all compare() calls
  failOnThreshold?: number; // fail if avg score < this % (e.g. 80)
  failOnAnyCase?: boolean; // fail if any single case fails (default: false)
  exitOnFail?: boolean; // call process.exit(1) on failure (default: true in CI)
}
