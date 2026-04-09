// Core
export {
  pe,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "./client";

// Config
export { defineConfig } from "./config";

// Validators
export { contains, notContains, matches, llmJudge } from "./core/validators";

// Types
export type {
  PhasioConfig,
  ProviderConfig,
  Provider,
  PromptVersion,
  SuiteOptions,
  TestDefinition,
  SuiteDefinition,
  RunResult,
  SuiteResult,
  TestResult,
  VersionResult,
  CaseResult,
  JudgeScore,
  HookFn,
  ReportStatus,
  Expect,
  ExpectFn,
  TelemetryConfig,
} from "./types";

// add for Evaluate
export { evaluate } from "./api/evaluate";
export type {
  EvaluateOptions,
  EvaluateResult,
  EvaluateCase,
} from "./api/evaluate";
