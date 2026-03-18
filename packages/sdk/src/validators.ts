import type { Expect, ExpectFn } from "./types";

// Helper functions for building test expectations
export const contains =
  (value: string): ExpectFn =>
  (output) =>
    output.toLowerCase().includes(value.toLowerCase());

export const notContains =
  (value: string): ExpectFn =>
  (output) =>
    !output.toLowerCase().includes(value.toLowerCase());

export const matches =
  (pattern: RegExp): ExpectFn =>
  (output) =>
    pattern.test(output);

export const llmJudge = (
  criteria: string,
): { type: "llm_judge"; criteria: string } => ({ type: "llm_judge", criteria });

// Resolve an Expect value into a check function or llm_judge descriptor
export function resolveExpect(
  expect: Expect,
): { kind: "fn"; fn: ExpectFn } | { kind: "llm_judge"; criteria: string } {
  // String shorthand: "contains:foo" | "not_contains:foo" | "regex:pattern"
  if (typeof expect === "string") {
    if (expect.startsWith("contains:")) {
      const value = expect.slice("contains:".length);
      return { kind: "fn", fn: contains(value) };
    }
    if (expect.startsWith("not_contains:")) {
      const value = expect.slice("not_contains:".length);
      return { kind: "fn", fn: notContains(value) };
    }
    if (expect.startsWith("regex:")) {
      const pattern = expect.slice("regex:".length);
      return { kind: "fn", fn: matches(new RegExp(pattern)) };
    }
    // Plain string = contains shorthand
    return { kind: "fn", fn: contains(expect) };
  }

  // RegExp
  if (expect instanceof RegExp) {
    return { kind: "fn", fn: matches(expect) };
  }

  // LLM judge object
  if (typeof expect === "object" && expect.type === "llm_judge") {
    return { kind: "llm_judge", criteria: expect.criteria };
  }

  // Custom function
  return { kind: "fn", fn: expect as ExpectFn };
}
