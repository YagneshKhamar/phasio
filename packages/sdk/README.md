# Phasio

Test and evaluate LLM prompts before production. A/B compare prompt versions across OpenAI and Anthropic with rule-based and LLM-as-a-judge checks.

## Install

```bash
npm install phasio
```

## Quick Start

```typescript
import { Phasio, contains, notContains, matches, llmJudge } from "phasio";

const pe = new Phasio({
  apiKey: "pe-xxxx", // from phasio.in dashboard
  providers: {
    provider: "openai",
    llmKey: "sk-...",
    model: "gpt-4o-mini",
  },
});

const result = await pe.compare({
  versions: [
    {
      label: "v1",
      template: "Summarize the following text in one sentence: {{input}}",
    },
    {
      label: "v2",
      template: "Give a concise one-sentence summary of: {{input}}",
    },
  ],
  tests: [
    {
      input: "The quick brown fox jumped over the lazy dog.",
      expect: contains("fox"),
    },
    {
      input: "What is 2 + 2?",
      expect: matches(/\b4\b/),
    },
    {
      input: "Explain what an API is.",
      expect: notContains("I cannot"),
    },
    {
      input: "Write a haiku about rain.",
      expect: llmJudge("Must be a valid haiku with 5-7-5 syllable structure"),
    },
    {
      input: "Return a number between 1 and 10.",
      expect: (output) => {
        const n = parseInt(output.trim());
        return !isNaN(n) && n >= 1 && n <= 10;
      },
    },
  ],
});

console.log(result.summary.bestVersion); // "v1"
```

## Multi-Provider

Run the same suite against OpenAI and Anthropic simultaneously:

```typescript
const pe = new Phasio({
  apiKey: "pe-xxxx",
  providers: [
    { provider: "openai", llmKey: "sk-...", model: "gpt-4o-mini" },
    {
      provider: "anthropic",
      llmKey: "sk-ant-...",
      model: "claude-haiku-4-5-20251001",
    },
  ],
});

const result = await pe.compare({ versions, tests });

console.log(result.summary.bestProvider); // "openai"
console.log(result.summary.bestVersion); // "v2"
```

## Terminal Output

```
Phasio
────────────────────────────────────────────────────────────
2 provider(s) · 2 version(s) · 4 tests

openai (gpt-4o-mini)
────────────────────────────────────────────────────────────
         v1             v2
case 1   ✓ 821ms        ✓ 743ms
case 2   ✓ 654ms        ✗ 901ms
case 3   ✓ 512ms        ✓ 489ms
case 4   ✗ 1.2s         ✓ 980ms

score    75%            75%
latency  801ms avg      778ms avg

= Tie on accuracy — v2 faster (778ms avg)

anthropic (claude-haiku-4-5-20251001)
────────────────────────────────────────────────────────────
         v1             v2
case 1   ✓ 1.1s         ✓ 980ms
...

Summary
────────────────────────────────────────────────────────────
  Best provider : openai
  Best version  : v2
```

## Expect Types

| Type                 | Example                                    |
| -------------------- | ------------------------------------------ |
| `contains(value)`    | `contains('Paris')`                        |
| `notContains(value)` | `notContains('I cannot')`                  |
| `matches(regex)`     | `matches(/^\d+$/)`                         |
| `llmJudge(criteria)` | `llmJudge('Should be polite and helpful')` |
| String shorthand     | `'contains:Paris'`                         |
| Custom function      | `(output) => output.length < 100`          |

## Options

```typescript
pe.compare({
  versions: [...],
  tests: [...],
  concurrency: 5,      // max parallel LLM calls per provider (default: 5)
  telemetry: false,    // opt-in to send anonymised analytics to your dashboard (default: false)
});
```

## Get an API Key

Sign up at [Phasio.in](https://phasio.in) and generate a key from Settings → API Keys.

## Configuration

| Environment Variable | Default                 | Description                                                             |
| -------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `PHASIO_BASE_URL`    | `https://api.phasio.in` | Override the Phasio API base URL (useful for self-hosting or local dev) |
