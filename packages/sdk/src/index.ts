// Main class
export { Phasio } from "./client";

// Validator helpers
export { contains, notContains, matches, llmJudge } from "./validators";

// Types — everything a developer needs
export type {
  PhasioConfig,
  ProviderConfig,
  Provider,
  RunOptions,
  PromptVersion,
  TestCase,
  Expect,
  ExpectFn,
  CompareResult,
  ProviderRunResult,
  VersionResult,
  CaseResult,
  ReportStatus,
} from "./types";
