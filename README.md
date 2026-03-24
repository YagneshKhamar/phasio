# Phasio

Test your LLM prompts before they break production.

Phasio lets you version prompts, define test cases, and run A/B evals across OpenAI and Anthropic. Catch regressions before they reach your users — via dashboard or `npm install @phasio/sdk`.

→ **[phasio.in](https://phasio.in)**

---

## What's in this repo

This repo contains `@phasio/sdk` — the open source npm package for running prompt evals in your codebase or CI pipeline.

The Phasio web platform (dashboard, history, analytics) is proprietary and not in this repo. Contributions and issues are accepted for the SDK only.

---

## @phasio/sdk

```bash
npm install @phasio/sdk
npm install -D ts-node typescript
```

### Setup

Create `phasio.config.ts` at your project root:

```typescript
import { defineConfig } from "@phasio/sdk";

export default defineConfig({
  apiKey: process.env.PHASIO_API_KEY,
  providers: [
    {
      provider: "openai",
      llmKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    },
  ],
  versions: [
    { label: "v1", template: "Answer briefly: {{input}}" },
    { label: "v2", template: "One sentence only: {{input}}" },
  ],
});
```

Create a `phasio/` folder and write test files:

```typescript
// phasio/capitals.test.ts
import { describe, pe, contains, llmJudge } from "@phasio/sdk";

describe("Capital cities", () => {
  pe.test("France", {
    input: "What is the capital of France?",
    expect: contains("Paris"),
  });

  pe.test("Quality check", {
    input: "Explain recursion simply",
    expect: llmJudge("Clear, concise, suitable for a beginner"),
  });
});
```

Run:

```bash
npx phasio                              # runs all *.test.ts in phasio/
npx phasio phasio/capitals.test.ts      # single file
npx phasio --dir src/evals              # custom directory
```

### Validators

| Helper                 | Passes when                                |
| ---------------------- | ------------------------------------------ |
| `contains('value')`    | output includes the string                 |
| `notContains('value')` | output does not include the string         |
| `matches(/regex/)`     | output matches the regex                   |
| `llmJudge('criteria')` | LLM scores output >= 7/10 against criteria |
| `(output) => boolean`  | custom function returns true               |

### Suite controls

```typescript
describe.only('Run only this suite', () => { ... });
describe.skip('Skip this suite', () => { ... });

pe.test.only('run only this test', { ... });
pe.test.skip('skip this test', { ... });
```

### Hooks

```typescript
import { describe, pe, beforeAll, afterAll } from '@phasio/sdk';

describe('My suite', () => {
  beforeAll(async () => { /* setup */ });
  afterAll(async () => { /* teardown */ });

  pe.test('my test', { ... });
});
```

### Config options

| Option            | Type                                 | Default                 | Description                        |
| ----------------- | ------------------------------------ | ----------------------- | ---------------------------------- |
| `apiKey`          | `string`                             | required                | Your Phasio API key                |
| `providers`       | `ProviderConfig or ProviderConfig[]` | required                | LLM provider(s) to run prompts     |
| `judgeProviders`  | `ProviderConfig or ProviderConfig[]` | falls back to providers | Provider(s) for llmJudge() scoring |
| `versions`        | `PromptVersion[]`                    | required                | Prompt versions to test            |
| `telemetry`       | `boolean`                            | `false`                 | Send results to Phasio dashboard   |
| `failOnThreshold` | `number`                             | none                    | Fail if avg score % is below this  |
| `failOnAnyCase`   | `boolean`                            | `false`                 | Fail if any single test case fails |
| `exitOnFail`      | `boolean`                            | `true`                  | process.exit(1) on failure         |

Full documentation: **[phasio.in](https://phasio.in)**

---

## Contributing

Contributions are welcome for `packages/sdk` only.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, what we accept, and how to open a PR.

---

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md). Do not open a public issue.

---

## License

`packages/sdk` is MIT licensed. See [packages/sdk/LICENSE](packages/sdk/LICENSE).

The Phasio web platform is proprietary software. All rights reserved, AppUnik.
