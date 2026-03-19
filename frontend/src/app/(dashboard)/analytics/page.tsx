"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGlobalAnalytics } from "@/lib/api-functions";

interface TrendPoint {
  date: string;
  score: number;
  provider: string;
  source: string;
  promptName: string;
}

interface ProviderStat {
  provider: string;
  model: string;
  avgScore: number;
  runs: number;
}

interface TopPrompt {
  id: string;
  name: string;
  totalRuns: number;
  avgScore: number;
  lastRun: string;
}

interface RegressingPrompt {
  id: string;
  name: string;
  delta: number;
  lastScore: number;
}

interface GlobalAnalytics {
  totalRuns: number;
  avgScore: number | null;
  avgLatency: number | null;
  sourceBreakdown: { web: number; sdk: number };
  providerBreakdown: ProviderStat[];
  trend: TrendPoint[];
  topPrompts: TopPrompt[];
  regressingPrompts: RegressingPrompt[];
}

function ScoreColor({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-400"
      : score >= 50
        ? "text-amber-400"
        : "text-red-400";
  return (
    <span className={`font-mono font-bold ${color}`}>{score.toFixed(0)}%</span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-400" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full bg-[#1a1a1a] rounded-full h-1 mt-1.5">
      <div
        className={`h-1 rounded-full ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<GlobalAnalytics>({
    queryKey: ["global-analytics"],
    queryFn: getGlobalAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-[#111111] border border-[#222222] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  const noData = !analytics || analytics.totalRuns === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
          Analytics
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Overview of all eval runs across your projects
        </p>
      </div>

      {noData ? (
        <div className="text-center py-24 border border-dashed border-[#222222] rounded">
          <p className="font-mono text-[#888888]">No eval runs yet</p>
          <p className="text-sm text-[#555555] mt-1">
            Run an eval from any prompt to see analytics here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Regression alert — most important, shown first */}
          {analytics!.regressingPrompts.length > 0 && (
            <div className="p-4 rounded border border-red-400/30 bg-red-400/5">
              <p className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3">
                ⚠ Regressions Detected
              </p>
              <div className="space-y-2">
                {analytics!.regressingPrompts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <Link
                      href={`/prompts/${p.id}`}
                      className="text-sm font-mono text-[#fafafa] hover:text-amber-400 transition-colors"
                    >
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-red-400">
                        {p.delta.toFixed(0)}% drop
                      </span>
                      <span className="text-xs font-mono text-[#555555]">
                        now {p.lastScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Runs", value: analytics!.totalRuns },
              {
                label: "Avg Score",
                value:
                  analytics!.avgScore !== null
                    ? `${analytics!.avgScore}%`
                    : "—",
              },
              {
                label: "Avg Latency",
                value:
                  analytics!.avgLatency !== null
                    ? `${analytics!.avgLatency}ms`
                    : "—",
              },
              {
                label: "SDK / Web",
                value: `${analytics!.sourceBreakdown.sdk} / ${analytics!.sourceBreakdown.web}`,
              },
            ].map(({ label, value }) => (
              <Card key={label} className="bg-[#111111] border-[#222222]">
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs font-mono text-[#555555] uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="font-mono text-xl font-bold text-[#fafafa]">
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Score trend */}
          {analytics!.trend.length > 0 && (
            <Card className="bg-[#111111] border-[#222222]">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider">
                  Score Trend — Last {analytics!.trend.length} Runs
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-end gap-1 h-28">
                  {analytics!.trend.map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center group relative"
                    >
                      <div
                        className={`w-full rounded-sm transition-all ${
                          point.score >= 80
                            ? "bg-green-400"
                            : point.score >= 50
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                        style={{
                          height: `${Math.max(4, (point.score / 100) * 108)}px`,
                        }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1.5 text-xs font-mono text-[#fafafa] whitespace-nowrap">
                        <p>
                          {point.score.toFixed(0)}% · {point.provider}
                        </p>
                        <p className="text-[#555555]">{point.promptName}</p>
                        <p className="text-[#555555]">
                          {new Date(point.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-mono text-[#444444]">
                    {new Date(analytics!.trend[0].date).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-mono text-[#444444]">
                    {new Date(
                      analytics!.trend[analytics!.trend.length - 1].date,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider breakdown */}
            {analytics!.providerBreakdown.length > 0 && (
              <Card className="bg-[#111111] border-[#222222]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider">
                    Provider Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {analytics!.providerBreakdown.map((p) => (
                    <div key={p.provider}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-[#fafafa]">
                            {p.provider}
                          </span>
                          <span className="text-xs font-mono text-[#555555]">
                            {p.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-[#555555]">
                            {p.runs} runs
                          </span>
                          <ScoreColor score={p.avgScore} />
                        </div>
                      </div>
                      <ScoreBar score={p.avgScore} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Top prompts */}
            {analytics!.topPrompts.length > 0 && (
              <Card className="bg-[#111111] border-[#222222]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider">
                    Top Prompts by Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {analytics!.topPrompts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Link
                          href={`/prompts/${p.id}`}
                          className="text-sm font-mono text-[#fafafa] hover:text-amber-400 transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs font-mono text-[#555555]">
                          {p.totalRuns} run{p.totalRuns !== 1 ? "s" : ""} · last{" "}
                          {new Date(p.lastRun).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <ScoreColor score={p.avgScore} />
                        <ScoreBar score={p.avgScore} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Source breakdown */}
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="font-mono text-xs text-[#555555] uppercase tracking-wider">
                Run Source
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-mono text-xs">
                    web
                  </Badge>
                  <span className="font-mono text-xl font-bold text-[#fafafa]">
                    {analytics!.sourceBreakdown.web}
                  </span>
                  <span className="text-xs font-mono text-[#555555]">
                    runs via dashboard
                  </span>
                </div>
                <div className="w-px h-8 bg-[#222222]" />
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                    sdk
                  </Badge>
                  <span className="font-mono text-xl font-bold text-[#fafafa]">
                    {analytics!.sourceBreakdown.sdk}
                  </span>
                  <span className="text-xs font-mono text-[#555555]">
                    runs via npm package
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
