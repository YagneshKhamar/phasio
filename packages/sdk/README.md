# @phasio/sdk

Test and evaluate LLM prompts before production. Write prompt tests like unit tests — version your prompts, define test cases, run evals across OpenAI and Anthropic, and catch regressions automatically in CI.

## Install

```bash
npm install @phasio/sdk
npm install -D ts-node typescript   # required peer deps
```

## Setup

### 1. Create `phasio.config.ts` at your project root

```typescript
import { defineConfig } from "@phasio/sdk";

export default defineConfig({
  projectKey: process.env.PHASIO_PROJECT_KEY, // from phasio.dev → Project → Project Key
  telemetry: true, // sync results to your phasio.dev dashboard
  failOnThreshold: 80, // fail if avg score drops below 80%
  exitOnFail: true, // exit(1) on failure — CI fails automatically
  providers: [
    {
      provider: "openai",
      llmKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    },
  ],
  versions: [
    { label: "v1", template: "Answer briefly: {{input}}" },
    { label: "v2", template: "Give a one sentence answer: {{input}}" },
  ],
});
```

### 2. Create a `phasio/` folder and write test files

```
my-project/
├── phasio.config.ts        ← global config
├── phasio/                 ← test files go here
│   ├── capitals.test.ts
│   ├── summarizer.test.ts
│   └── llm-judge.test.ts
└── package.json
```

### 3. Run

```bash
npx phasio                              # runs all *.test.ts in phasio/
npx phasio phasio/capitals.test.ts      # single file
npx phasio --dir src/evals              # custom directory
```

---

## Writing Tests

Test files use a Jest-like API. Import `describe`, `pe`, and validators — no boilerplate, no config in each file.

```typescript
// phasio/capitals.test.ts
import { describe, pe, contains, notContains, matches } from "@phasio/sdk";

describe("Capital cities", () => {
  pe.test("France", {
    input: "What is the capital of France?",
    expect: contains("Paris"),
  });

  pe.test("basic math", {
    input: "What is 2 + 2?",
    expect: matches(/\b4\b/),
  });

  pe.test("no refusal", {
    input: "Describe the color of the sky",
    expect: notContains("I cannot"),
  });
});
```

```typescript
// phasio/quality.test.ts
import { describe, pe, llmJudge, beforeAll, afterAll } from "@phasio/sdk";

describe("Response quality", () => {
  beforeAll(async () => {
    // runs once before all tests in this suite
  });

  afterAll(async () => {
    // runs once after all tests in this suite
  });

  pe.test("haiku structure", {
    input: "Write a haiku about rain",
    expect: llmJudge("Must follow 5-7-5 syllable structure and be about rain"),
  });

  pe.test("beginner explanation", {
    input: "Explain recursion",
    expect: llmJudge(
      "Clear, concise, suitable for a beginner with no CS background",
    ),
  });
});
```

---

## Validators

| Helper                 | Passes when                                |
| ---------------------- | ------------------------------------------ |
| `contains('value')`    | output includes the string                 |
| `notContains('value')` | output does not include the string         |
| `matches(/regex/)`     | output matches the regex                   |
| `llmJudge('criteria')` | LLM scores output >= 7/10 against criteria |
| `(output) => boolean`  | custom function returns true               |

---

## Suite Controls

```typescript
describe.only('Run only this suite', () => { ... });
describe.skip('Skip this suite', () => { ... });

pe.test.only('run only this test', { ... });
pe.test.skip('skip this test', { ... });
```

---

## Hooks

Hooks run at the suite level. Useful for setup/teardown, logging, or loading shared data.

```typescript
import { describe, pe, beforeAll, beforeEach, afterEach, afterAll } from '@phasio/sdk';

describe('My suite', () => {
  beforeAll(async () => { /* once before all tests */ });
  beforeEach(async () => { /* before each test */ });
  afterEach(async () => { /* after each test */ });
  afterAll(async () => { /* once after all tests */ });

  pe.test('my test', { ... });
});
```

---

## Multi-Provider

Run the same tests against multiple providers simultaneously:

```typescript
// phasio.config.ts
export default defineConfig({
  providers: [
    { provider: 'openai',    llmKey: process.env.OPENAI_API_KEY,    model: 'gpt-4o-mini' },
    { provider: 'anthropic', llmKey: process.env.ANTHROPIC_API_KEY, model: 'claude-haiku-4-5-20251001' },
  ],
  versions: [...],
});
```

Terminal output shows results per provider per version:

```
  ✓ capital of France   openai/v1 100% 1.1s   openai/v2 100% 930ms   anthropic/v1 100% 1.2s   anthropic/v2 100% 810ms
```

---

## Multiple Judge Providers

Separate the provider that runs your prompts from the provider(s) that judge `llmJudge()` outputs. When multiple judges are set, their scores are averaged.

```typescript
export default defineConfig({
  providers: [
    { provider: 'openai', llmKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' },
  ],
  judgeProviders: [
    { provider: 'openai',    llmKey: process.env.OPENAI_API_KEY,    model: 'gpt-4o-mini' },
    { provider: 'anthropic', llmKey: process.env.ANTHROPIC_API_KEY, model: 'claude-haiku-4-5-20251001' },
  ],
  versions: [...],
});
```

On a failing `llmJudge` test, the terminal shows individual scores:

```
  ✗ haiku structure     llm_judge [openai=6 anthropic=5] -> avg 5.5/10 — syllable count is off
```

If `judgeProviders` is not set, the run providers are used as judges.

---

## Configuration Reference

### `phasio.config.ts`

| Option            | Type                                 | Default                   | Description                                        |
| ----------------- | ------------------------------------ | ------------------------- | -------------------------------------------------- |
| `projectKey`      | `string`                             | required                  | Project-scoped key from your Project page → Project Key section. Legacy `apiKey` still accepted but deprecated. |
| `providers`       | `ProviderConfig \| ProviderConfig[]` | required                  | One or more LLM providers to run prompts           |
| `judgeProviders`  | `ProviderConfig \| ProviderConfig[]` | falls back to `providers` | Provider(s) used for `llmJudge()` scoring          |
| `versions`        | `PromptVersion[]`                    | required                  | Prompt versions to test — must include `{{input}}` |
| `telemetry`       | `boolean`                            | `false`                   | Send results to your phasio.dev dashboard          |
| `failOnThreshold` | `number`                             | none                      | Fail if avg score % drops below this value         |
| `failOnAnyCase`   | `boolean`                            | `false`                   | Fail if any single test case fails                 |
| `exitOnFail`      | `boolean`                            | `true`                    | `process.exit(1)` on failure                       |

> **Note:** `projectKey` is the preferred option as of v0.5.0. The legacy `apiKey` field still works but is deprecated.

### `ProviderConfig`

| Field      | Type                      | Description                                                    |
| ---------- | ------------------------- | -------------------------------------------------------------- |
| `provider` | `'openai' \| 'anthropic'` | LLM provider                                                   |
| `llmKey`   | `string`                  | API key for the provider                                       |
| `model`    | `string`                  | Model to use (e.g. `gpt-4o-mini`, `claude-haiku-4-5-20251001`) |

### CLI

| Command                            | Description                               |
| ---------------------------------- | ----------------------------------------- |
| `npx phasio`                       | Run all `*.test.ts` files in `phasio/`    |
| `npx phasio file.test.ts`          | Run a single file                         |
| `npx phasio f1.test.ts f2.test.ts` | Run specific files                        |
| `npx phasio --dir path/to/tests`   | Run all `*.test.ts` in a custom directory |

You can also set the default test directory in `package.json`:

```json
{
  "phasio": {
    "testDir": "evals"
  }
}
```

### Environment Variables

| Variable          | Default                  | Description           |
| ----------------- | ------------------------ | --------------------- |
| `PHASIO_BASE_URL` | `https://api.phasio.dev` | Override API base URL |

---

## CI/CD Integration

```yaml
# GitHub Actions
- name: Run prompt evals
  run: npx phasio
  env:
    PHASIO_PROJECT_KEY: ${{ secrets.PHASIO_PROJECT_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

```yaml
# GitLab CI
eval:
  script:
    - npx phasio
```

The process exits with code `1` if evals fail — your pipeline fails automatically.

---

## Terminal Output

```
Phasio v0.4.0
Running 2 test files...

▶ phasio/capitals.test.ts

Capital cities
────────────────────────────────────────────────────────────────
  ✓ France             v1 100% 1.1s   v2 100% 930ms   2.1s
  ✓ basic math         v1 100% 620ms  v2 100% 580ms   1.2s
  ✗ wrong city         v1 0%   810ms  v2 0%   750ms   1.6s
       v1          expected to contain "Berlin"

════════════════════════════════════════════════════════════════════════
 Test Results
════════════════════════════════════════════════════════════════════════
 Suite                                 Tests     Results       Time
 ───────────────────────────────────────────────────────────────────────
 ✓ Capital cities                      2/3       1 failed      4.9s
 ───────────────────────────────────────────────────────────────────────
 Total                                 2/3       1 failed      4.9s
════════════════════════════════════════════════════════════════════════
 ✗ 1 test failed in 1 suite
════════════════════════════════════════════════════════════════════════
```

---

## Get an API Key

Sign up at [phasio.dev](https://phasio.dev) and generate a key from **Settings → API Keys**.
