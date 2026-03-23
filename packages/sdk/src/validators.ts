import type { Expect, ExpectFn } from "./types";

// Helper functions for building test expectations
export const contains = (value: string): ExpectFn & { _desc: string } => {
  const fn = (output: string) =>
    output.toLowerCase().includes(value.toLowerCase());
  (fn as any)._desc = `contains "${value}"`;
  return fn as ExpectFn & { _desc: string };
};

export const notContains = (value: string): ExpectFn & { _desc: string } => {
  const fn = (output: string) =>
    !output.toLowerCase().includes(value.toLowerCase());
  (fn as any)._desc = `not contain "${value}"`;
  return fn as ExpectFn & { _desc: string };
};

export const matches = (pattern: RegExp): ExpectFn & { _desc: string } => {
  const fn = (output: string) => pattern.test(output);
  (fn as any)._desc = `match ${pattern.toString()}`;
  return fn as ExpectFn & { _desc: string };
};

export const llmJudge = (
  criteria: string,
): { type: "llm_judge"; criteria: string } => ({ type: "llm_judge", criteria });

// Resolve an Expect value into a check function or llm_judge descriptor
export function resolveExpect(
  expect: Expect,
):
  | { kind: "fn"; fn: ExpectFn; desc?: string }
  | { kind: "llm_judge"; criteria: string } {
  // String shorthand: "contains:foo" | "not_contains:foo" | "regex:pattern"
  if (typeof expect === "string") {
    if (expect.startsWith("contains:")) {
      const value = expect.slice("contains:".length);
      return { kind: "fn", fn: contains(value), desc: `contains "${value}"` };
    }
    if (expect.startsWith("not_contains:")) {
      const value = expect.slice("not_contains:".length);
      return {
        kind: "fn",
        fn: notContains(value),
        desc: `not contain "${value}"`,
      };
    }
    if (expect.startsWith("regex:")) {
      const pattern = expect.slice("regex:".length);
      return {
        kind: "fn",
        fn: matches(new RegExp(pattern)),
        desc: `match /${pattern}/`,
      };
    }
    // Plain string = contains shorthand
    return { kind: "fn", fn: contains(expect), desc: `contains "${expect}"` };
  }

  // RegExp
  if (expect instanceof RegExp) {
    return {
      kind: "fn",
      fn: matches(expect),
      desc: `match ${expect.toString()}`,
    };
  }

  // LLM judge object
  if (typeof expect === "object" && expect.type === "llm_judge") {
    return { kind: "llm_judge", criteria: expect.criteria };
  }

  // Custom function — check if it has a _desc attached (from our helpers)
  const fn = expect as ExpectFn & { _desc?: string };
  return { kind: "fn", fn, desc: fn._desc };
}
