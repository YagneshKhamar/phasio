# PromptEval

A SaaS developer tool for testing and evaluating LLM prompts before production.
Version your prompts, define test cases, run A/B comparisons, and catch regressions automatically.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Eval Strategies](#eval-strategies)
- [Known Issues](#known-issues)
- [MVP Roadmap](#mvp-roadmap)

---

## Overview

**Core loop:** Create a project → add a prompt → create versions → define test suites → run A/B evals → view results and history.

**What PromptEval does:**

- Lets you version your LLM prompts and track changes over time
- Runs both versions in parallel against the same test suite
- Evaluates outputs using rule-based checks (`contains`) or LLM-as-a-judge (`llm_judge`)
- Stores all results so you can track regressions over time
- Supports OpenAI (GPT-4o-mini) and Anthropic (Claude Haiku) as providers

---

## Tech Stack

| Layer         | Stack                                                         |
| ------------- | ------------------------------------------------------------- |
| Frontend      | Next.js 16, React 19, TailwindCSS v4, TanStack Query, Zustand |
| Backend       | NestJS 11, Prisma 7, MariaDB, JWT auth                        |
| LLM Providers | OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-haiku-20240307`) |
| API Docs      | Swagger (auto-generated at `/api`)                            |

---

## Project Structure

```
prompteval/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma               # Full data model
│   │   └── migrations/                 # All DB migrations
│   └── src/
│       ├── auth/
│       │   ├── auth.controller.ts      # POST /auth/login, /auth/register
│       │   ├── auth.service.ts         # JWT generation, bcrypt compare
│       │   ├── jwt-auth.guard.ts       # Guard used on all protected routes
│       │   ├── jwt.strategy.ts         # Passport JWT strategy
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       ├── register.dto.ts
│       │       └── auth-response.dto.ts
│       ├── projects/
│       │   ├── projects.controller.ts  # GET/POST/DELETE /projects
│       │   ├── projects.service.ts
│       │   └── dto/create-project.dto.ts
│       ├── prompts/
│       │   ├── prompts.controller.ts   # GET/POST/DELETE /prompts
│       │   ├── prompts.service.ts
│       │   ├── versions.controller.ts  # GET/POST /prompts/:id/versions
│       │   ├── versions.service.ts
│       │   └── dto/
│       │       ├── create-prompt.dto.ts
│       │       └── create-version.dto.ts
│       ├── evals/
│       │   ├── evals.controller.ts     # POST /evals/run, GET /evals/prompt/:id
│       │   ├── evals.service.ts        # Core A/B comparison logic
│       │   ├── suites.controller.ts    # CRUD for suites + test cases
│       │   ├── suites.service.ts
│       │   ├── runners/
│       │   │   ├── rule-based.runner.ts  # contains check
│       │   │   └── llm-judge.runner.ts   # LLM scoring 1-10
│       │   └── dto/
│       │       ├── run-eval.dto.ts
│       │       ├── create-suite.dto.ts
│       │       └── create-test-case.dto.ts
│       ├── users/
│       │   ├── users.controller.ts     # GET /users/profile, PATCH /users/settings
│       │   ├── users.service.ts
│       │   └── dto/
│       │       ├── update-settings.dto.ts
│       │       └── update-password.dto.ts
│       ├── prisma/
│       │   └── prisma.service.ts       # Prisma client singleton
│       ├── app.module.ts
│       └── main.ts                     # Bootstrap, CORS, global pipes, Swagger
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   └── (dashboard)/
        │       ├── layout.tsx              # Sidebar + auth guard
        │       ├── dashboard/page.tsx      # Project list
        │       ├── projects/[id]/page.tsx  # Prompt list within a project
        │       ├── settings/page.tsx       # API keys + provider preference
        │       └── prompts/[id]/
        │           ├── page.tsx            # Versions + test suites management
        │           ├── eval/page.tsx       # A/B eval runner + results
        │           └── history/page.tsx    # All past eval runs
        ├── lib/
        │   ├── api-functions.ts        # ALL frontend API calls live here
        │   ├── api.ts                  # Axios instance with JWT interceptor
        │   ├── store.ts                # Zustand auth store
        │   └── error.ts                # Error message extraction helper
        ├── components/ui/              # shadcn/ui components
        └── providers/
            └── query-provider.tsx      # TanStack Query setup
```

---

## Data Model

```
User
 └── Projects
      └── Prompts
           ├── PromptVersions
           │    └── EvalRuns
           │         └── EvalResults
           └── TestSuites
                └── TestCases
                     └── EvalResults
```

### Schema Summary

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String    // bcrypt hashed
  openaiApiKey      String?   // stored in DB per user
  anthropicApiKey   String?
  preferredProvider String    @default("openai")
  projects          Project[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  prompts     Prompt[]
}

model Prompt {
  id        String          @id @default(cuid())
  name      String
  projectId String
  versions  PromptVersion[]
  suites    TestSuite[]
}

model PromptVersion {
  id       String  @id @default(cuid())
  version  Int                    // auto-incremented per prompt
  template String  @db.Text       // must contain {{input}}
  promptId String
  evalRuns EvalRun[]
}

model TestSuite {
  id       String     @id @default(cuid())
  name     String
  promptId String
  cases    TestCase[]
}

model TestCase {
  id         String  @id @default(cuid())
  input      String  @db.Text
  checkType  String  // "contains" | "llm_judge"
  checkValue String  @db.Text
  suiteId    String
  results    EvalResult[]
}

model EvalRun {
  id              String      @id @default(cuid())
  promptVersionId String
  suiteId         String
  score           Float       // percentage 0-100
  totalCases      Int
  passedCases     Int
  results         EvalResult[]
}

model EvalResult {
  id         String  @id @default(cuid())
  evalRunId  String
  testCaseId String
  passed     Boolean
  output     String  @db.Text
  score      Float?  // only for llm_judge (1-10)
  reason     String? @db.Text  // only for llm_judge
}
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MariaDB running locally
- An OpenAI or Anthropic API key

### Backend

```bash
cd backend
npm install

# Set up your .env (see Environment Variables below)
# Then run migrations
npx prisma migrate dev

# Start dev server
npm run start:dev
```

Backend runs on `http://localhost:2000`
Swagger docs available at `http://localhost:2000/api`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/prompteval"
PORT=2000
JWT_SECRET=your_jwt_secret_here
```

> **Note:** API keys for OpenAI/Anthropic are stored per-user in the database, not in `.env`. Users add their own keys via the Settings page.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:2000
```

---

## API Reference

All endpoints except `/auth/*` require a `Bearer` JWT token in the `Authorization` header.

### Auth

| Method | Endpoint         | Body                                       | Description                    |
| ------ | ---------------- | ------------------------------------------ | ------------------------------ |
| POST   | `/auth/register` | `{ firstName, lastName, email, password }` | Register new user, returns JWT |
| POST   | `/auth/login`    | `{ email, password }`                      | Login, returns JWT             |

### Projects

| Method | Endpoint        | Body                     | Description                                 |
| ------ | --------------- | ------------------------ | ------------------------------------------- |
| GET    | `/projects`     | —                        | Get all projects for current user           |
| POST   | `/projects`     | `{ name, description? }` | Create a project                            |
| DELETE | `/projects/:id` | —                        | Delete a project (cascades to all children) |

### Prompts

| Method | Endpoint                      | Body                 | Description                                |
| ------ | ----------------------------- | -------------------- | ------------------------------------------ |
| GET    | `/prompts/project/:projectId` | —                    | Get all prompts in a project               |
| POST   | `/prompts/project/:projectId` | `{ name, template }` | Create a prompt with initial version       |
| GET    | `/prompts/:id`                | —                    | Get a single prompt with versions + suites |
| DELETE | `/prompts/:id`                | —                    | Delete a prompt (cascades)                 |

### Prompt Versions

| Method | Endpoint                                 | Body           | Description                                        |
| ------ | ---------------------------------------- | -------------- | -------------------------------------------------- |
| GET    | `/prompts/:promptId/versions`            | —              | Get all versions of a prompt                       |
| GET    | `/prompts/:promptId/versions/:versionId` | —              | Get a single version                               |
| POST   | `/prompts/:promptId/versions`            | `{ template }` | Add a new version (auto-increments version number) |

> Templates must contain `{{input}}` — this is where test case input gets injected at eval time.

### Test Suites

| Method | Endpoint                   | Body       | Description                             |
| ------ | -------------------------- | ---------- | --------------------------------------- |
| GET    | `/suites/prompt/:promptId` | —          | Get all suites for a prompt             |
| POST   | `/suites/prompt/:promptId` | `{ name }` | Create a suite                          |
| DELETE | `/suites/:id`              | —          | Delete a suite (cascades to test cases) |

### Test Cases

| Method | Endpoint                         | Body                               | Description        |
| ------ | -------------------------------- | ---------------------------------- | ------------------ |
| POST   | `/suites/:suiteId/cases`         | `{ input, checkType, checkValue }` | Add a test case    |
| DELETE | `/suites/:suiteId/cases/:caseId` | —                                  | Delete a test case |

**`checkType` values:**

- `contains` — `checkValue` is a substring the output must include (case-insensitive)
- `llm_judge` — `checkValue` is a natural language scoring criteria sent to an LLM judge

### Evals

| Method | Endpoint                  | Body                                  | Description                                          |
| ------ | ------------------------- | ------------------------------------- | ---------------------------------------------------- |
| POST   | `/evals/run`              | `{ versionAId, versionBId, suiteId }` | Run A/B eval, returns full results for both versions |
| GET    | `/evals/prompt/:promptId` | —                                     | Get all past eval runs for a prompt                  |
| GET    | `/evals/run/:runId`       | —                                     | Get a single eval run with full results              |

**`POST /evals/run` response shape:**

```json
{
  "versionA": {
    "id": "...",
    "version": 1,
    "evalRunId": "...",
    "score": 80.0,
    "passedCases": 4,
    "totalCases": 5,
    "results": [
      {
        "testCaseId": "...",
        "input": "What is 2+2?",
        "output": "The answer is 4.",
        "passed": true,
        "score": null,
        "reason": null
      }
    ]
  },
  "versionB": { ... }
}
```

### Users

| Method | Endpoint          | Body                                                                             | Description                                    |
| ------ | ----------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| GET    | `/users/profile`  | —                                                                                | Get current user profile (API keys are masked) |
| PATCH  | `/users/settings` | `{ firstName?, lastName?, openaiApiKey?, anthropicApiKey?, preferredProvider? }` | Update settings                                |
| PATCH  | `/users/password` | `{ currentPassword, newPassword }`                                               | Change password                                |

> API keys are masked in profile responses: only the last 4 characters are shown.

---

## Frontend Pages

| Route                  | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `/login`               | Auth — login form                                |
| `/register`            | Auth — registration form                         |
| `/dashboard`           | Lists all projects for the logged-in user        |
| `/projects/:id`        | Lists all prompts within a project               |
| `/prompts/:id`         | Manage prompt versions and test suites           |
| `/prompts/:id/eval`    | Run an A/B eval — pick two versions + a suite    |
| `/prompts/:id/history` | View all past eval runs for a prompt             |
| `/settings`            | Update profile, API keys, preferred LLM provider |

All frontend API calls are centralised in `src/lib/api-functions.ts`. Do not make API calls anywhere else.

---

## Eval Strategies

### `contains`

Simple case-insensitive substring match.

```
output.toLowerCase().includes(checkValue.toLowerCase())
```

**When to use:** Checking for specific words, phrases, or keywords in the output.

**Example:**

- Input: `"What is the capital of France?"`
- Check value: `"paris"`
- Passes if the output contains the word "paris" (case-insensitive)

### `llm_judge`

Uses an LLM (same provider as the user's preferred provider) to score the output 1–10 against a natural language criteria. Passes if score ≥ 7.

**System prompt sent to the judge:**

```
You are an evaluator. Score the given output against the criteria from 1-10.
Respond ONLY with a valid JSON object: {"score": 7, "reason": "your reason here"}
```

**When to use:** Evaluating tone, helpfulness, accuracy, format, or any criteria that can't be expressed as a simple string match.

**Example:**

- Input: `"Explain recursion to a 10-year-old"`
- Check value: `"The explanation should be simple, use an analogy, and avoid technical jargon"`

---

## Known Issues

These bugs exist in the current codebase and are not yet fixed:

**1. Sequential LLM calls (performance)**
`executeRun` in `evals.service.ts` uses a `for` loop that `await`s each LLM call one by one. With 10 test cases using `llm_judge`, this produces 40 sequential LLM calls (output + judge per case, × 2 versions). Will cause timeouts on real-world usage.
Fix: `Promise.all` with a concurrency limiter.

**2. No latency tracking**
`EvalResult` has no `latencyMs` field. There is currently no way to track how long each LLM call took, which is a key metric for prompt evaluation.
Fix: Add `latencyMs Int?` to the `EvalResult` schema and track it per call.

**3. History shows orphaned runs, not A/B pairs**
The history page displays individual `EvalRun` records. When you run an A/B eval, it creates two `EvalRun` rows with no link between them. There is no way to see "this run compared v1 vs v2".
Fix: Add an `EvalComparison` table that links `runAId` and `runBId`.

**4. Cannot clear API keys via settings**
`updateSettings` uses `...(dto.openaiApiKey && { openaiApiKey: dto.openaiApiKey })` — empty strings are falsy and silently ignored. Sending `""` to clear a key does nothing.
Fix: Explicit `null` handling in the DTO and service.

---

## MVP Roadmap

Priority order for remaining work:

| #   | Task                                                             | Status         |
| --- | ---------------------------------------------------------------- | -------------- |
| 1   | Fix sequential LLM calls → `Promise.all` + concurrency limit     | ⬜ Not started |
| 2   | Add `latencyMs` to `EvalResult` schema + track per call          | ⬜ Not started |
| 3   | Add `EvalComparison` table + update history UI to show A/B pairs | ⬜ Not started |
| 4   | Add `regex` and `not_contains` validators                        | ⬜ Not started |
| 5   | Fix `updateSettings` empty string bug                            | ⬜ Not started |

**Post-MVP (do not build yet):**

- Cost / token tracking
- Statistical significance testing
- Webhooks and CI/CD integration
- Team / workspace / RBAC
- Scheduled and batch evals
- Trend analytics and regression detection
- Automated test coverage

---

## Coding Conventions

- **Backend:** NestJS service/controller pattern. Prisma for all DB access. DTOs with `class-validator`. Every new endpoint needs `@UseGuards(JwtAuthGuard)` and an ownership check before touching any data.
- **Frontend:** TanStack Query for all server state. Zustand for client state. Sonner for toasts. All API calls go through `src/lib/api-functions.ts` — no exceptions.
- **Styling:** Dark theme only. Background `#111111` / `#0a0a0a`. Accent `amber-400`. `font-mono` throughout. No inline styles — Tailwind only.
- **Templates:** Must contain `{{input}}` — validated on the frontend before submission.
