import type { Expect, ExpectFn, DescribedFn } from '../types';

const JUDGE_PASS_THRESHOLD = 7;

// ─── Public validator factories ───────────────────────────────────────────────

/**
 * Pass if output contains the given string (case-insensitive).
 * @example pe.test('name', { input: '...', expect: contains('Paris') })
 */
export function contains(value: string): DescribedFn {
  const fn: DescribedFn = (output: string) =>
    output.toLowerCase().includes(value.toLowerCase());
  fn._desc = `contains "${value}"`;
  return fn;
}

/**
 * Pass if output does NOT contain the given string (case-insensitive).
 */
export function notContains(value: string): DescribedFn {
  const fn: DescribedFn = (output: string) =>
    !output.toLowerCase().includes(value.toLowerCase());
  fn._desc = `not contain "${value}"`;
  return fn;
}

/**
 * Pass if output matches the given regular expression.
 */
export function matches(pattern: RegExp): DescribedFn {
  const fn: DescribedFn = (output: string) => pattern.test(output);
  fn._desc = `match ${pattern.toString()}`;
  return fn;
}

/**
 * Pass if an LLM judge scores the output >= 7/10 against the given criteria.
 * @example pe.test('quality', { input: '...', expect: llmJudge('Should be concise') })
 */
export function llmJudge(criteria: string): { type: 'llm_judge'; criteria: string } {
  return { type: 'llm_judge', criteria };
}

// ─── Internal: detect natural language string ─────────────────────────────────

const SHORTHAND_PREFIXES = ['contains:', 'not_contains:', 'regex:', 'matches:'];

function isNaturalLanguage(s: string): boolean {
  return !SHORTHAND_PREFIXES.some((prefix) => s.startsWith(prefix));
}

// ─── Internal: resolved expect shape ─────────────────────────────────────────

export type ResolvedExpect =
  | { kind: 'fn'; fn: ExpectFn; desc?: string }
  | { kind: 'llm_judge'; criteria: string }
  | { kind: 'natural_language'; criteria: string };

/**
 * Normalise any Expect value into a flat array of ResolvedExpect.
 * Handles: arrays, strings (shorthand + natural language), RegExp, functions, llmJudge objects.
 */
export function resolveExpect(expect: Expect): ResolvedExpect[] {
  // Array — resolve each item and flatten
  if (Array.isArray(expect)) {
    return expect.flatMap((e) => resolveExpect(e));
  }

  // String — shorthand or natural language
  if (typeof expect === 'string') {
    if (expect.startsWith('contains:')) {
      const value = expect.slice('contains:'.length);
      return [{ kind: 'fn', fn: contains(value), desc: `contains "${value}"` }];
    }
    if (expect.startsWith('not_contains:')) {
      const value = expect.slice('not_contains:'.length);
      return [{ kind: 'fn', fn: notContains(value), desc: `not contain "${value}"` }];
    }
    if (expect.startsWith('regex:') || expect.startsWith('matches:')) {
      const pattern = expect.includes(':') ? expect.slice(expect.indexOf(':') + 1) : expect;
      return [{ kind: 'fn', fn: matches(new RegExp(pattern)), desc: `match /${pattern}/` }];
    }
    // Plain string with no prefix → natural language → LLM judge
    if (isNaturalLanguage(expect)) {
      return [{ kind: 'natural_language', criteria: expect }];
    }
    // Fallback: treat as contains
    return [{ kind: 'fn', fn: contains(expect), desc: `contains "${expect}"` }];
  }

  // RegExp
  if (expect instanceof RegExp) {
    return [{ kind: 'fn', fn: matches(expect), desc: `match ${expect.toString()}` }];
  }

  // llmJudge object
  if (typeof expect === 'object' && 'type' in expect && expect.type === 'llm_judge') {
    return [{ kind: 'llm_judge', criteria: expect.criteria }];
  }

  // Function (plain or with _desc)
  const fn = expect as DescribedFn;
  return [{ kind: 'fn', fn, desc: fn._desc }];
}
