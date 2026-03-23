# @phasio/sdk

Test and evaluate LLM prompts before production. A/B compare prompt versions across OpenAI and Anthropic with rule-based and LLM-as-a-judge checks. Built for CI/CD pipelines.

## Install

```bash
npm install @phasio/sdk
```

## Quick Start

```typescript
import { Phasio, contains, notContains, matches, llmJudge } from "@phasio/sdk";

const pe = new Phasio({
  apiKey: "pe-xxxx", // from phasio.in → Settings → API Keys
  telemetry: true, // sync analytics to your phasio.in dashboard
  failOnThreshold: 80, // fail if avg score drops below 80%
  failOnAnyCase: false, // fail if any single case fails
  exitOnFail: true, // exit(1) on failure — CI pipeline fails automatically
  providers: {
    provider: "openai",
    llmKey: "sk-...",
    model: "gpt-4o-mini",
  },
});

const result = await pe.compare({
  versions: [
    { label: "v1", template: "Summarize in one sentence: {{input}}" },
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
    { input: "What is 2 + 2?", expect: matches(/\b4\b/) },
    { input: "Explain what an API is.", expect: notContains("I cannot") },
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

console.log(result.summary.bestVersion); // "v2"
console.log(result.summary.overallScore); // 87.5
console.log(result.summary.report.passed); // true | false
```

## Terminal Output

```
Phasio — eval run
────────────────────────────────────────────────────────────
1 provider(s) · 2 version(s) · 4 tests

openai (gpt-4o-mini)
────────────────────────────────────────────────────────────
         v1              v2
case 1   ✓ 821ms         ✓ 743ms
case 2   ✗ 654ms         ✓ 612ms
  v1: expected: contains "fox"
case 3   ✓ 512ms         ✓ 489ms
case 4   ✓ 1.2s          ✓ 980ms

score    75%             100%
latency  801ms avg       706ms avg

✓ v2 wins (100% · 706ms avg)

────────────────────────────────────────────────────────────
  PASS  score 87.5% meets threshold 80%
────────────────────────────────────────────────────────────
```

Or if it fails:

```
────────────────────────────────────────────────────────────
  FAIL  score 62.5% below threshold 80%
────────────────────────────────────────────────────────────
# exits with code 1 — CI pipeline fails
```

## Multi-Provider

Run the same suite against OpenAI and Anthropic simultaneously:

```typescript
const pe = new Phasio({
  apiKey: "pe-xxxx",
  telemetry: true,
  failOnThreshold: 80,
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

## CI/CD Integration

Works with any CI system that checks exit codes:

```yaml
# GitHub Actions
- name: Run prompt evals
  run: npx ts-node eval.ts
  env:
    OPENAI_KEY: ${{ secrets.OPENAI_KEY }}
    PHASIO_KEY: ${{ secrets.PHASIO_KEY }}
```

```yaml
# GitLab CI
eval:
  script:
    - npx ts-node eval.ts
```

The process exits with code `1` if evals fail — your pipeline fails automatically. No extra configuration needed.

## Expect Types

| Type                 | Example                           | Fails when                        |
| -------------------- | --------------------------------- | --------------------------------- |
| `contains(value)`    | `contains('Paris')`               | output doesn't include the string |
| `notContains(value)` | `notContains('I cannot')`         | output includes the string        |
| `matches(regex)`     | `matches(/^\d+$/)`                | output doesn't match the pattern  |
| `llmJudge(criteria)` | `llmJudge('Should be polite')`    | LLM score < 7/10                  |
| String shorthand     | `'contains:Paris'`                | same as `contains('Paris')`       |
| Custom function      | `(output) => output.length < 100` | function returns false            |

## Configuration

### Constructor (`new Phasio({...})`)

| Option            | Type                                 | Default                 | Description                                      |
| ----------------- | ------------------------------------ | ----------------------- | ------------------------------------------------ |
| `apiKey`          | `string`                             | required                | Your Phasio API key from phasio.in               |
| `providers`       | `ProviderConfig \| ProviderConfig[]` | required                | One or more LLM providers                        |
| `telemetry`       | `boolean`                            | `false`                 | Send anonymised analytics to phasio.in dashboard |
| `failOnThreshold` | `number`                             | none                    | Fail if avg score % drops below this value       |
| `failOnAnyCase`   | `boolean`                            | `false`                 | Fail if any single test case fails               |
| `exitOnFail`      | `boolean`                            | `true`                  | Call `process.exit(1)` on failure                |
| `baseUrl`         | `string`                             | `https://api.phasio.in` | Override API base URL                            |

### `compare({ ... })`

| Option        | Type              | Default  | Description                         |
| ------------- | ----------------- | -------- | ----------------------------------- |
| `versions`    | `PromptVersion[]` | required | Prompt versions to compare          |
| `tests`       | `TestCase[]`      | required | Test cases to run                   |
| `concurrency` | `number`          | `5`      | Max parallel LLM calls per provider |

### Environment Variables

| Variable          | Default                 | Description           |
| ----------------- | ----------------------- | --------------------- |
| `PHASIO_BASE_URL` | `https://api.phasio.in` | Override API base URL |

## Result Shape

```typescript
result.providers[0].versions[0].results; // per-case results
result.providers[0].versions[0].score; // 0–100
result.summary.bestVersion; // winning version label
result.summary.bestProvider; // winning provider
result.summary.overallScore; // avg across all versions and providers
result.summary.report.passed; // true | false
result.summary.report.reason; // human readable reason
```

## Get an API Key

Sign up at [phasio.in](https://phasio.in) and generate a key from **Settings → API Keys**.
