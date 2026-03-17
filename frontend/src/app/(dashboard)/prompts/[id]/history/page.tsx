"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPrompt, getEvalComparisons } from "@/lib/api-functions";

interface EvalResult {
  id: string;
  passed: boolean;
  output: string;
  score: number | null;
  reason: string | null;
  latencyMs: number | null;
  testCase: {
    input: string;
    checkType: string;
    checkValue: string;
  };
}

interface EvalRun {
  id: string;
  score: number;
  totalCases: number;
  passedCases: number;
  createdAt: string;
  promptVersion: {
    id: string;
    version: number;
  };
  results: EvalResult[];
}

interface EvalComparison {
  id: string;
  winner: string | null;
  createdAt: string;
  runA: EvalRun;
  runB: EvalRun;
}

interface Prompt {
  id: string;
  name: string;
  projectId: string;
}

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();

  const { data: prompt } = useQuery<Prompt>({
    queryKey: ["prompt", id],
    queryFn: () => getPrompt(id),
    enabled: !!id,
  });

  const { data: comparisons = [], isLoading } = useQuery<EvalComparison[]>({
    queryKey: ["eval-comparisons", id],
    queryFn: () => getEvalComparisons(id),
    enabled: !!id,
  });

  const ScoreBar = ({ score }: { score: number }) => (
    <div className="w-full bg-[#1a1a1a] rounded-full h-1 mt-2">
      <div
        className={`h-1 rounded-full ${
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

  const ScoreDisplay = ({
    score,
    isWinner,
  }: {
    score: number;
    isWinner: boolean;
  }) => (
    <div className="text-right">
      <span
        className={`font-mono text-xl font-bold ${
          isWinner
            ? "text-green-400"
            : score >= 80
              ? "text-green-400"
              : score >= 50
                ? "text-amber-400"
                : "text-red-400"
        }`}
      >
        {score.toFixed(0)}%
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-[#111111] border border-[#222222] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

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
          href={`/projects/${prompt?.projectId}`}
          className="hover:text-amber-400 transition-colors"
        >
          project
        </Link>
        <span>/</span>
        <Link
          href={`/prompts/${id}`}
          className="hover:text-amber-400 transition-colors"
        >
          {prompt?.name}
        </Link>
        <span>/</span>
        <span className="text-[#888888]">history</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
            Eval History
          </h1>
          <p className="text-[#888888] text-sm mt-1">
            {comparisons.length} A/B comparison
            {comparisons.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href={`/prompts/${id}/eval`}
          className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm px-4 py-2 rounded transition-colors"
        >
          Run Eval →
        </Link>
      </div>

      {/* Comparisons list */}
      {comparisons.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded">
          <p className="font-mono text-[#888888]">No eval runs yet</p>
          <p className="text-sm text-[#555555] mt-1">
            Run your first A/B eval to see results here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comparisons.map((comparison) => (
            <Card key={comparison.id} className="bg-[#111111] border-[#222222]">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#555555]">
                      {new Date(comparison.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {/* Winner banner */}
                  <div
                    className={`text-xs font-mono px-3 py-1 rounded border ${
                      comparison.winner === "tie"
                        ? "border-[#333333] text-[#888888] bg-[#1a1a1a]"
                        : "border-green-400/30 text-green-400 bg-green-400/5"
                    }`}
                  >
                    {comparison.winner === "A"
                      ? `✓ v${comparison.runA.promptVersion.version} wins`
                      : comparison.winner === "B"
                        ? `✓ v${comparison.runB.promptVersion.version} wins`
                        : "= Tie"}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                {/* Side by side scores */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    {
                      run: comparison.runA,
                      label: "Version A",
                      isWinner: comparison.winner === "A",
                    },
                    {
                      run: comparison.runB,
                      label: "Version B",
                      isWinner: comparison.winner === "B",
                    },
                  ].map(({ run, label, isWinner }) => (
                    <div
                      key={run.id}
                      className={`p-4 rounded border ${
                        isWinner
                          ? "border-green-400/20 bg-green-400/5"
                          : "border-[#222222] bg-[#0a0a0a]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#555555]">
                            {label}
                          </span>
                          <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-mono text-xs">
                            v{run.promptVersion.version}
                          </Badge>
                          {isWinner && (
                            <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                              winner
                            </Badge>
                          )}
                        </div>
                        <ScoreDisplay score={run.score} isWinner={isWinner} />
                      </div>
                      <ScoreBar score={run.score} />
                      <p className="text-xs font-mono text-[#555555] mt-2">
                        {run.passedCases}/{run.totalCases} passed
                      </p>
                    </div>
                  ))}
                </div>

                {/* Case by case results */}
                <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider mb-3">
                  Results
                </CardTitle>
                <div className="space-y-2">
                  {comparison.runA.results.map((resultA, index) => {
                    const resultB = comparison.runB.results[index];
                    return (
                      <div
                        key={resultA.id}
                        className="border border-[#222222] rounded overflow-hidden"
                      >
                        {/* Input row */}
                        <div className="bg-[#0a0a0a] px-3 py-2 border-b border-[#222222]">
                          <p className="text-xs font-mono text-[#555555] uppercase tracking-wider mb-0.5">
                            Input
                          </p>
                          <p className="text-xs font-mono text-[#888888]">
                            {resultA.testCase?.input}
                          </p>
                        </div>

                        {/* Side by side outputs */}
                        <div className="grid grid-cols-2 divide-x divide-[#222222]">
                          {[
                            { result: resultA, label: "Version A" },
                            { result: resultB, label: "Version B" },
                          ].map(({ result, label }) => (
                            <div key={label} className="p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-[#555555]">
                                  {label}
                                </span>
                                <div className="flex items-center gap-2">
                                  {result?.latencyMs != null && (
                                    <span className="text-xs font-mono text-[#444444]">
                                      ⏱ {result.latencyMs}ms
                                    </span>
                                  )}
                                  <Badge
                                    className={`font-mono text-xs ${
                                      result?.passed
                                        ? "bg-green-400/10 text-green-400 border-green-400/20"
                                        : "bg-red-400/10 text-red-400 border-red-400/20"
                                    }`}
                                  >
                                    {result?.passed ? "✓ pass" : "✗ fail"}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs font-mono text-[#888888] leading-relaxed line-clamp-3">
                                {result?.output}
                              </p>
                              {result?.score != null && (
                                <p className="text-xs font-mono text-[#555555]">
                                  score: {result.score}/10 — {result.reason}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
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
