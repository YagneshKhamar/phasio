// Main class
export { PromptEval } from "./client";

// Validator helpers
export { contains, notContains, matches, llmJudge } from "./validators";

// Types — everything a developer needs
export type {
  PromptEvalConfig,
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
} from "./types";
