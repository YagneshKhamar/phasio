# Contributing to Phasio

Thank you for your interest in contributing to Phasio.

## What's Open Source

Only the **`packages/sdk`** directory (`@phasio/sdk`) is open source under the MIT license.

The `frontend/` and `backend/` directories are proprietary and **not open for contribution**.

---

## Contributing to @phasio/sdk

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
git clone https://github.com/YagneshKhamar/phasio.git
cd phasio/packages/sdk
npm install
npm run build
```

### Local Testing

```bash
npm run build
npm link

# In your test project
npm link @phasio/sdk
```

### What We Accept

- Bug fixes with a clear reproduction case
- New validator types (contains, notContains, matches, llmJudge pattern)
- New LLM provider support in `src/core/llm.ts`
- TypeScript type improvements
- Documentation fixes

### What We Don't Accept

- Changes to the public API shape without prior discussion
- New dependencies without prior discussion
- Anything outside `packages/sdk/`

### Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b fix/your-fix-name`
3. Make your changes in `packages/sdk/src/`
4. Build and verify: `npm run build`
5. Open a PR with a clear description of what and why

### Opening an Issue

Use GitHub Issues for:

- Bug reports — include SDK version, Node version, and a minimal repro
- Feature requests — describe the use case, not just the solution

---

## Code Style

- TypeScript strict mode
- No `any` unless unavoidable — add a comment explaining why
- Keep public API additions backward compatible
- Match the existing file structure (`core/`, `suite/`, `report/`)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](packages/sdk/LICENSE).
