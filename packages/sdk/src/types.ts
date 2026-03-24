export type Provider = "openai" | "anthropic";

export interface ProviderConfig {
  provider: Provider;
  llmKey: string;
  model: string;
}

export type HookFn = () => void | Promise<void>;

export type ExpectFn = (output: string) => boolean | Promise<boolean>;

export type Expect =
  | string
  | RegExp
  | ExpectFn
  | { type: "llm_judge"; criteria: string };

export interface PromptVersion {
  label: string;
  template: string; // must contain {{input}}
}

export interface TestDefinition {
  name: string;
  input: string;
  expect: Expect;
  only?: boolean;
  skip?: boolean;
}

export interface SuiteDefinition {
  name: string;
  tests: TestDefinition[];
  only?: boolean;
  skip?: boolean;
  hooks: {
    beforeAll: HookFn[];
    beforeEach: HookFn[];
    afterAll: HookFn[];
    afterEach: HookFn[];
  };
}

export interface JudgeScore {
  provider: string;
  model: string;
  score: number;
  reason: string;
}

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

export interface ReportStatus {
  passed: boolean;
  reason: string;
}

export interface PhasioConfig {
  apiKey: string;
  providers: ProviderConfig | ProviderConfig[];
  judgeProviders?: ProviderConfig | ProviderConfig[];
  versions?: PromptVersion[];
  telemetry?: boolean;
  failOnThreshold?: number;
  failOnAnyCase?: boolean;
  exitOnFail?: boolean;
}
