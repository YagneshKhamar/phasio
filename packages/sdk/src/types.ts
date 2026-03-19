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
  telemetry?: boolean; // default: false — opt-in to send analytics to Phasio
}

export interface CaseResult {
  input: string;
  label?: string;
  passed: boolean;
  output: string;
  latencyMs: number;
  score?: number;
  reason?: string;
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

export interface CompareResult {
  providers: ProviderRunResult[];
  summary: {
    bestProvider: string; // provider with highest winning score
    bestVersion: string; // version label that won most across providers
  };
}

export interface PhasioConfig {
  apiKey: string; // your Phasio platform key (pe-xxx)
  providers: ProviderConfig | ProviderConfig[]; // one or many
  baseUrl?: string; // override for self-hosted, default: https://api.phasio.in
}
