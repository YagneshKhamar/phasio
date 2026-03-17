"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPrompt, runEval } from "@/lib/api-functions";
import { getErrorMessage } from "@/lib/error";

interface Version {
  id: string;
  version: number;
  template: string;
}

interface TestCase {
  id: string;
  input: string;
  checkType: string;
  checkValue: string;
}

interface Suite {
  id: string;
  name: string;
  cases: TestCase[];
}

interface Prompt {
  id: string;
  name: string;
  projectId: string;
  versions: Version[];
  suites: Suite[];
}

interface EvalResult {
  testCaseId: string;
  input: string;
  output: string;
  passed: boolean;
  score: number | null;
  reason: string | null;
  latencyMs: number | null;
}

interface EvalRunResult {
  id: string;
  version: number;
  evalRunId: string;
  score: number;
  passedCases: number;
  totalCases: number;
  results: EvalResult[];
}

interface EvalResponse {
  versionA: EvalRunResult;
  versionB: EvalRunResult;
}

export default function EvalPage() {
  const { id } = useParams<{ id: string }>();

  const [versionAId, setVersionAId] = useState("");
  const [versionBId, setVersionBId] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResponse | null>(null);

  const { data: prompt } = useQuery<Prompt>({
    queryKey: ["prompt", id],
    queryFn: () =>
      getPrompt(id).then((data) => ({
        ...data,
        versions: data.versions ?? [],
        suites: (data.suites ?? []).map((s: Suite) => ({
          ...s,
          cases: s.cases ?? [],
        })),
      })),
    enabled: !!id,
  });

  const evalMutation = useMutation({
    mutationFn: runEval,
    onSuccess: (data: EvalResponse) => {
      setEvalResult(data);
      toast.success("Eval completed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt) {
      toast.error("Prompt not loaded yet");
      return;
    }

    if (prompt.versions.length < 2) {
      toast.error("You need at least 2 versions to run an eval");
      return;
    }

    if (prompt.suites.length === 0) {
      toast.error("Create a test suite first");
      return;
    }

    const selectedSuite = prompt.suites.find((s) => s.id === suiteId);
    if (selectedSuite && selectedSuite.cases.length === 0) {
      toast.error("Selected suite has no test cases");
      return;
    }

    if (!versionAId || !versionBId || !suiteId) {
      toast.error("Select both versions and a suite");
      return;
    }

    if (versionAId === versionBId) {
      toast.error("Select two different versions");
      return;
    }

    evalMutation.mutate({ versionAId, versionBId, suiteId });
  };

  const ScoreBar = ({ score }: { score: number }) => (
    <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 mt-2">
      <div
        className={`h-1.5 rounded-full transition-all ${
          score >= 80
            ? "bg-green-400"
            : score >= 50
              ? "bg-amber-400"
              : "bg-red-400"
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  );

  if (!prompt) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono text-[#555555] mb-6">
        <Link
          href="/dashboard"
          className="hover:text-amber-400 transition-colors"
        >
          projects
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${prompt.projectId}`}
          className="hover:text-amber-400 transition-colors"
        >
          project
        </Link>
        <span>/</span>
        <Link
          href={`/prompts/${id}`}
          className="hover:text-amber-400 transition-colors"
        >
          {prompt.name}
        </Link>
        <span>/</span>
        <span className="text-[#888888]">eval</span>
      </div>

      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
          Run Eval
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Compare two prompt versions against a test suite
        </p>
      </div>

      {/* Config */}
      <Card className="bg-[#111111] border-[#222222] mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRun} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                  Version A
                </label>
                <select
                  required
                  value={versionAId}
                  onChange={(e) => setVersionAId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2"
                >
                  <option value="">Select version</option>
                  {prompt.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} — {v.template.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                  Version B
                </label>
                <select
                  required
                  value={versionBId}
                  onChange={(e) => setVersionBId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2"
                >
                  <option value="">Select version</option>
                  {prompt.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} — {v.template.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                Test Suite
              </label>
              <select
                required
                value={suiteId}
                onChange={(e) => setSuiteId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2"
              >
                <option value="">Select suite</option>
                {prompt.suites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.cases.length} cases)
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={evalMutation.isPending}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold"
            >
              {evalMutation.isPending
                ? "Running eval — this may take a moment..."
                : "Run Eval →"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {evalResult && (
        <div className="space-y-6">
          {/* Score summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Version A", data: evalResult.versionA },
              { label: "Version B", data: evalResult.versionB },
            ].map(({ label, data }) => (
              <Card key={label} className="bg-[#111111] border-[#222222]">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-[#888888]">
                      {label}
                    </span>
                    <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-mono text-xs">
                      v{data.version}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-2">
                    <span
                      className={`font-mono text-3xl font-bold ${
                        data.score >= 80
                          ? "text-green-400"
                          : data.score >= 50
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {data.score.toFixed(0)}%
                    </span>
                    <span className="text-[#555555] font-mono text-sm mb-1">
                      {data.passedCases}/{data.totalCases} passed
                    </span>
                  </div>
                  <ScoreBar score={data.score} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Winner banner */}
          <div
            className={`p-4 rounded border font-mono text-sm text-center ${
              evalResult.versionA.score > evalResult.versionB.score
                ? "border-green-400/30 bg-green-400/5 text-green-400"
                : evalResult.versionB.score > evalResult.versionA.score
                  ? "border-green-400/30 bg-green-400/5 text-green-400"
                  : "border-[#222222] bg-[#111111] text-[#888888]"
            }`}
          >
            {evalResult.versionA.score > evalResult.versionB.score
              ? "✓ Version A performs better"
              : evalResult.versionB.score > evalResult.versionA.score
                ? "✓ Version B performs better"
                : "= Both versions perform equally"}
          </div>

          {/* Diff table */}
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
                Case by Case Diff
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {evalResult.versionA.results.map((resultA, index) => {
                const resultB = evalResult.versionB.results[index];
                return (
                  <div
                    key={resultA.testCaseId}
                    className="border border-[#222222] rounded overflow-hidden"
                  >
                    {/* Input */}
                    <div className="bg-[#0a0a0a] px-4 py-2 border-b border-[#222222]">
                      <p className="text-xs font-mono text-[#555555] uppercase tracking-wider mb-1">
                        Input
                      </p>
                      <p className="text-sm font-mono text-[#888888]">
                        {resultA.input}
                      </p>
                    </div>

                    {/* Side by side outputs */}
                    <div className="grid grid-cols-2 divide-x divide-[#222222]">
                      {[
                        { result: resultA, label: "Version A" },
                        { result: resultB, label: "Version B" },
                      ].map(({ result, label }) => (
                        <div key={label} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[#555555]">
                              {label}
                            </span>
                            <Badge
                              className={`font-mono text-xs ${
                                result.passed
                                  ? "bg-green-400/10 text-green-400 border-green-400/20"
                                  : "bg-red-400/10 text-red-400 border-red-400/20"
                              }`}
                            >
                              {result.passed ? "✓ pass" : "✗ fail"}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-[#888888] leading-relaxed">
                            {result.output}
                          </p>
                          {result.score !== null && (
                            <p className="text-xs font-mono text-[#555555]">
                              score: {result.score}/10 — {result.reason}
                            </p>
                          )}
                          {result.latencyMs !== null && (
                            <p className="text-xs font-mono text-[#444444]">
                              ⏱ {result.latencyMs}ms
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <button
        onClick={() => window.history.back()}
        className="mt-8 text-xs font-mono text-[#555555] hover:text-amber-400 transition-colors"
      >
        ← back
      </button>
    </div>
  );
}
