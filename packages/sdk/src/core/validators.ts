import type { Expect, ExpectFn } from "../types";

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
): { type: "llm_judge"; criteria: string } => ({
  type: "llm_judge",
  criteria,
});

export function resolveExpect(
  expect: Expect,
):
  | { kind: "fn"; fn: ExpectFn; desc?: string }
  | { kind: "llm_judge"; criteria: string } {
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
    return { kind: "fn", fn: contains(expect), desc: `contains "${expect}"` };
  }
  if (expect instanceof RegExp) {
    return {
      kind: "fn",
      fn: matches(expect),
      desc: `match ${expect.toString()}`,
    };
  }
  if (typeof expect === "object" && expect.type === "llm_judge") {
    return { kind: "llm_judge", criteria: expect.criteria };
  }
  const fn = expect as ExpectFn & { _desc?: string };
  return { kind: "fn", fn, desc: fn._desc };
}
