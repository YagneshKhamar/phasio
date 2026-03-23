"use client";

import Image from "next/image";
import Link from "next/link";

const sdkCode = `import { Phasio, contains, matches, llmJudge } from '@phasio/sdk';

const pe = new Phasio({
  apiKey: 'pe-xxxx',
  providers: [
    { provider: 'openai', llmKey: 'sk-...', model: 'gpt-4o-mini' },
    { provider: 'anthropic', llmKey: 'sk-ant-...', model: 'claude-haiku-4-5-20251001' },
  ],
});

const result = await pe.compare({
  versions: [
    { label: 'v1', template: 'Summarize: {{input}}' },
    { label: 'v2', template: 'Brief summary of: {{input}}' },
  ],
  tests: [
    { input: 'The quick brown fox...', expect: contains('fox') },
    { input: 'What is 2+2?',          expect: matches(/\\b4\\b/) },
    { input: 'Write a haiku',          expect: llmJudge('Valid 5-7-5 haiku') },
  ],
});`;

const terminalOutput = `PromptEval
────────────────────────────────────────
1 provider · 2 versions · 3 tests

openai (gpt-4o-mini)
────────────────────────────────────────
         v1             v2
case 1   ✓ 821ms        ✓ 743ms
case 2   ✓ 654ms        ✓ 612ms
case 3   ✓ 1.2s         ✓ 980ms

score    100%           100%
latency  891ms avg      778ms avg

= Tie on accuracy — v2 faster (778ms avg)`;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Phasio" className="h-7 w-7" />
          <span className="font-mono text-lg font-bold text-amber-400">
            Phasio
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-mono text-[#888888] hover:text-amber-400 transition-colors border border-[#222222] px-4 py-2 rounded"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="text-xs font-mono bg-amber-400 hover:bg-amber-300 text-black font-semibold px-4 py-2 rounded transition-colors"
          >
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
        <div className="inline-flex items-center gap-2 border border-amber-400/20 bg-amber-400/5 text-amber-400 font-mono text-xs px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          Now in beta
        </div>

        <h1 className="font-mono text-5xl font-bold text-[#fafafa] leading-tight max-w-3xl mb-6">
          Test your prompts before{" "}
          <span className="text-amber-400">they break production</span>
        </h1>

        <p className="text-[#888888] text-lg max-w-xl mb-10 leading-relaxed">
          Version your prompts, define test cases, and run A/B evals across
          OpenAI and Anthropic. Catch regressions before they reach your users.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/register"
            className="font-mono bg-amber-400 hover:bg-amber-300 text-black font-semibold px-6 py-3 rounded transition-colors"
          >
            Start for free →
          </Link>
          <Link
            href="/login"
            className="font-mono text-[#888888] hover:text-amber-400 transition-colors text-sm"
          >
            Already have an account?
          </Link>
        </div>
        <p className="text-xs font-mono text-[#555555]">
          Also available as{" "}
          <code className="text-amber-400">npm install @phasio/sdk</code>
        </p>
      </section>

      {/* SDK Code snippet */}
      <section className="border-t border-[#222222] px-6 py-20 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-mono text-2xl font-bold text-[#fafafa] mb-3">
              Works in your CI/CD pipeline
            </h2>
            <p className="text-[#888888] text-sm">
              Install the SDK and run evals in code — no GUI required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div className="bg-[#111111] border border-[#222222] rounded overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#222222] bg-[#0a0a0a]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                </div>
                <span className="text-xs font-mono text-[#555555] ml-2">
                  eval.ts
                </span>
              </div>
              <pre className="p-4 text-xs font-mono text-[#888888] overflow-x-auto leading-relaxed">
                <code>{sdkCode}</code>
              </pre>
            </div>

            {/* Terminal output */}
            <div className="bg-[#111111] border border-[#222222] rounded overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#222222] bg-[#0a0a0a]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333333]" />
                </div>
                <span className="text-xs font-mono text-[#555555] ml-2">
                  terminal
                </span>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                <code>
                  {terminalOutput.split("\n").map((line, i) => {
                    if (line.includes("✓")) {
                      return (
                        <span key={i} className="text-green-400">
                          {line}
                          {"\n"}
                        </span>
                      );
                    }
                    if (line.includes("✗")) {
                      return (
                        <span key={i} className="text-red-400">
                          {line}
                          {"\n"}
                        </span>
                      );
                    }
                    if (
                      line.includes("100%") ||
                      line.includes("Tie") ||
                      line.includes("wins")
                    ) {
                      return (
                        <span key={i} className="text-amber-400">
                          {line}
                          {"\n"}
                        </span>
                      );
                    }
                    if (line.startsWith("─") || line.startsWith("─")) {
                      return (
                        <span key={i} className="text-[#333333]">
                          {line}
                          {"\n"}
                        </span>
                      );
                    }
                    return (
                      <span key={i} className="text-[#888888]">
                        {line}
                        {"\n"}
                      </span>
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#222222] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-mono text-2xl font-bold text-[#fafafa] text-center mb-12">
            Everything you need to ship prompts with confidence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "⎇",
                title: "Prompt Versioning",
                description:
                  "Track every change to your prompts. Compare v1 vs v2 side by side with full history.",
              },
              {
                icon: "⚡",
                title: "Eval Runner",
                description:
                  "Run rule-based and LLM-judge evals against your test suites. Get pass/fail per case.",
              },
              {
                icon: "◈",
                title: "Diff Reports",
                description:
                  "See exactly which test cases regressed between versions before you deploy.",
              },
              {
                icon: "✦",
                title: "LLM Judge",
                description:
                  "Define natural language criteria. Let GPT or Claude score your outputs automatically.",
              },
              {
                icon: "⟳",
                title: "Multi-Provider",
                description:
                  "Run the same suite against OpenAI and Anthropic in parallel. Compare providers side by side.",
              },
              {
                icon: "◉",
                title: "Analytics",
                description:
                  "Track score trends over time. Get regression alerts when a prompt drops in performance.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-[#111111] border border-[#222222] rounded p-6 hover:border-amber-400/30 transition-colors"
              >
                <span className="text-amber-400 text-xl font-mono">
                  {feature.icon}
                </span>
                <h3 className="font-mono font-semibold text-[#fafafa] mt-3 mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#888888] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#222222] px-6 py-20 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-mono text-2xl font-bold text-[#fafafa] text-center mb-12">
            How it works
          </h2>
          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Create a prompt and version it",
                description:
                  "Write your prompt template using {{input}} as the variable. Every change creates a new version automatically.",
              },
              {
                step: "02",
                title: "Define your test cases",
                description:
                  "Add inputs and expected behaviors. Use contains, regex, not_contains checks or LLM judge for nuanced scoring.",
              },
              {
                step: "03",
                title: "Run an eval — web or SDK",
                description:
                  "Select two versions and a test suite on the dashboard, or run via npm install @phasio/sdk in your CI pipeline.",
              },
              {
                step: "04",
                title: "Ship with confidence",
                description:
                  "See exactly what improved and what regressed. Deploy only when your score goes up.",
              },
            ].map((step) => (
              <div key={step.step} className="flex gap-6 items-start">
                <span className="font-mono text-amber-400 text-sm font-bold shrink-0 mt-0.5">
                  {step.step}
                </span>
                <div>
                  <h3 className="font-mono font-semibold text-[#fafafa] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[#888888] text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#222222] px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-3xl font-bold text-[#fafafa] mb-4">
            Ready to stop guessing?
          </h2>
          <p className="text-[#888888] mb-8">
            Start testing your prompts in minutes. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="font-mono bg-amber-400 hover:bg-amber-300 text-black font-semibold px-8 py-3 rounded transition-colors inline-block"
            >
              Get started for free →
            </Link>
            <code className="text-xs font-mono text-[#ccc8c8] border border-[#222222] px-4 py-3 rounded">
              npm install @phasio/sdk
            </code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222222] px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            height="100"
            width="100"
            alt="Phasio"
            className="h-5 w-5"
          />
          <span className="font-mono text-sm font-bold text-amber-400">
            Phasio
          </span>
        </div>
        <span className="text-xs font-mono text-[#555555]">
          Built for developers who ship LLM features
        </span>
      </footer>
    </div>
  );
}
