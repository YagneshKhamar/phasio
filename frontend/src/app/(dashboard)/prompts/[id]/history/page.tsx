"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPrompt, getEvalHistory } from "@/lib/api-functions";

interface EvalResult {
  id: string;
  passed: boolean;
  output: string;
  score: number | null;
  reason: string | null;
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

  const { data: history = [], isLoading } = useQuery<EvalRun[]>({
    queryKey: ["eval-history", id],
    queryFn: () => getEvalHistory(id),
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-[#111111] border border-[#222222] rounded animate-pulse"
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
            {history.length} run{history.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href={`/prompts/${id}/eval`}
          className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm px-4 py-2 rounded transition-colors"
        >
          Run Eval →
        </Link>
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded">
          <p className="font-mono text-[#888888]">No eval runs yet</p>
          <p className="text-sm text-[#555555] mt-1">
            Run your first eval to see results here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((run) => (
            <Card key={run.id} className="bg-[#111111] border-[#222222]">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-mono text-xs">
                      v{run.promptVersion.version}
                    </Badge>
                    <span className="text-xs font-mono text-[#555555]">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-lg font-bold ${
                        run.score >= 80
                          ? "text-green-400"
                          : run.score >= 50
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {run.score.toFixed(0)}%
                    </span>
                    <span className="text-xs font-mono text-[#555555]">
                      {run.passedCases}/{run.totalCases} passed
                    </span>
                  </div>
                </div>
                <ScoreBar score={run.score} />
              </CardHeader>

              <CardContent className="px-5 pb-4 space-y-2">
                <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider mb-3">
                  Results
                </CardTitle>
                {run.results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded border border-[#222222]"
                  >
                    <Badge
                      className={`font-mono text-xs shrink-0 mt-0.5 ${
                        result.passed
                          ? "bg-green-400/10 text-green-400 border-green-400/20"
                          : "bg-red-400/10 text-red-400 border-red-400/20"
                      }`}
                    >
                      {result.passed ? "✓" : "✗"}
                    </Badge>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-xs font-mono text-[#888888]">
                        {result.testCase?.input ?? "N/A"}
                      </p>
                      <p className="text-xs font-mono text-[#555555] truncate">
                        → {result.output}
                      </p>
                      {result.score !== null && (
                        <p className="text-xs font-mono text-[#444444]">
                          score: {result.score}/10 — {result.reason}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-[#1a1a1a] text-[#555555] border-[#222222] font-mono text-xs shrink-0">
                      {result.testCase.checkType}
                    </Badge>
                  </div>
                ))}
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
