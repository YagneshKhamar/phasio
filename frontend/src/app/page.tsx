"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-amber-400">
          Phasio
        </span>
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
          Phasio lets you version your prompts, define test cases, and run evals
          to catch regressions before they reach your users.
        </p>

        <div className="flex items-center gap-4">
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
                  "Define natural language criteria. Let GPT score your outputs automatically.",
              },
              {
                icon: "◉",
                title: "Test Suites",
                description:
                  "Organize test cases into suites. Run the same suite across multiple prompt versions.",
              },
              {
                icon: "⟳",
                title: "Eval History",
                description:
                  "Every eval run is stored. Go back and compare any two runs over time.",
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
                  "Add inputs and expected behaviors. Use contains checks for simple cases or LLM judge for nuanced scoring.",
              },
              {
                step: "03",
                title: "Run an eval",
                description:
                  "Select two versions and a test suite. Phasio runs both against every test case and returns a diff report.",
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
          <Link
            href="/register"
            className="font-mono bg-amber-400 hover:bg-amber-300 text-black font-semibold px-8 py-3 rounded transition-colors inline-block"
          >
            Get started for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222222] px-6 py-6 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-amber-400">
          Phasio
        </span>
        <span className="text-xs font-mono text-[#555555]">
          Built for developers who ship LLM features
        </span>
      </footer>
    </div>
  );
}
