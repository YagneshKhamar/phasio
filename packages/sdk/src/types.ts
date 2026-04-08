// ─── Providers ────────────────────────────────────────────────────────────────

export type Provider = 'openai' | 'anthropic';

export interface ProviderConfig {
  provider: Provider;
  llmKey: string;
  model: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export type HookFn = () => void | Promise<void>;

// ─── Expect types ─────────────────────────────────────────────────────────────

export type ExpectFn = (output: string) => boolean | Promise<boolean>;

/** A validator function with an optional description for terminal output */
export interface DescribedFn extends ExpectFn {
  _desc?: string;
}

export type Expect =
  | string                              // shorthand "contains:x" OR natural language
  | RegExp
  | ExpectFn
  | { type: 'llm_judge'; criteria: string }
  | Expect[];                           // multiple expects — ALL must pass

// ─── Versions ────────────────────────────────────────────────────────────────

export interface PromptVersion {
  label: string;   // e.g. "v1", "v2", "gpt4-tuned"
  template: string; // must contain {{input}}
}

// ─── Suite options (optional 2nd arg to describe()) ──────────────────────────

export interface SuiteOptions {
  /** Matches Prompt.slug in the dashboard for correct telemetry attribution */
  promptSlug?: string;
  /** Override global config versions for this suite only */
  versions?: PromptVersion[];
  /** Override global config providers for this suite only */
  providers?: ProviderConfig[];
}

// ─── Test definition ──────────────────────────────────────────────────────────

export interface TestDefinition {
  name: string;
  input: string;
  expect: Expect;
  only?: boolean;
  skip?: boolean;
}

// ─── Suite definition (internal registry) ────────────────────────────────────

export interface SuiteDefinition {
  name: string;
  options: SuiteOptions;
  tests: TestDefinition[];
  rules: string[];   // suite-level assertions applied to every test
  only?: boolean;
  skip?: boolean;
  hooks: {
    beforeAll: HookFn[];
    beforeEach: HookFn[];
    afterAll: HookFn[];
    afterEach: HookFn[];
  };
}

// ─── Judge types ──────────────────────────────────────────────────────────────

export interface JudgeScore {
  provider: string;
  model: string;
  score: number;   // 1–10, or -1 on parse error
  reason: string;
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface CaseResult {
  name: string;
  input: string;
  passed: boolean;
  output: string;
  latencyMs: number;
  score?: number;
  reason?: string;
  expectDescription?: string;
  judgeScores?: JudgeScore[];
}

export interface VersionResult {
  label: string;
  provider: string;
  model: string;
  score: number;
  passedCases: number;
  totalCases: number;
  avgLatencyMs: number;
  results: CaseResult[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  versions: VersionResult[];
  duration: number;
}

export interface SuiteResult {
  name: string;
  promptSlug?: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skipped?: boolean;
  duration: number;
  tests: TestResult[];
}

export interface RunResult {
  suites: SuiteResult[];
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface TelemetryConfig {
  enabled: boolean;
  /** Never send test inputs/outputs to Phasio. Default: false */
  sendInputs?: boolean;
}

export interface PhasioConfig {
  /** Project-scoped API key (preferred) */
  projectKey?: string;
  /** Legacy user-scoped key — still accepted, maps to projectKey internally */
  apiKey?: string;
  providers: ProviderConfig | ProviderConfig[];
  judgeProviders?: ProviderConfig | ProviderConfig[];
  /** Global default versions — used when suite has no version override */
  versions?: PromptVersion[];
  /** true = send telemetry with defaults. false/undefined = no telemetry */
  telemetry?: boolean | TelemetryConfig;
  failOnThreshold?: number;
  failOnAnyCase?: boolean;
  exitOnFail?: boolean;
}

// ─── Telemetry payload ────────────────────────────────────────────────────────

export interface TelemetryRunPayload {
  promptSlug: string;
  versionLabel: string;
  /** First 16 chars of sha256(template) — never the raw template */
  templateHash: string;
  provider: string;
  model: string;
  suiteName: string;
  totalCases: number;
  passedCases: number;
  durationMs: number;
}

export interface TelemetryPayload {
  apiKey: string;
  sdkVersion: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  durationMs: number;
  runs: TelemetryRunPayload[];
}

// ─── Report status ────────────────────────────────────────────────────────────

export interface ReportStatus {
  passed: boolean;
  reason: string;
}
