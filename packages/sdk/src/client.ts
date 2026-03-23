import { version as sdkVersion } from "../package.json";
import type {
  PhasioConfig,
  ProviderConfig,
  RunOptions,
  CompareResult,
  ProviderRunResult,
  ReportStatus,
} from "./types";
import { runForProvider } from "./runner";
import { printResults, printError } from "./output";
import { validateApiKey } from "./auth";

const DEFAULT_BASE_URL = process.env.PHASIO_BASE_URL ?? "https://api.phasio.in";

export class Phasio {
  private readonly config: PhasioConfig;
  private readonly providers: ProviderConfig[];

  constructor(config: PhasioConfig) {
    this.config = config;
    this.providers = Array.isArray(config.providers)
      ? config.providers
      : [config.providers];

    if (this.providers.length === 0) {
      throw new Error("At least one provider must be configured");
    }

    for (const p of this.providers) {
      if (!p.llmKey)
        throw new Error(`Missing llmKey for provider "${p.provider}"`);
      if (!p.model)
        throw new Error(`Missing model for provider "${p.provider}"`);
    }
  }

  async compare(options: RunOptions): Promise<CompareResult> {
    const { versions, tests, concurrency = 5 } = options;
    const telemetry = this.config.telemetry ?? false;
    const failOnThreshold = this.config.failOnThreshold;
    const failOnAnyCase = this.config.failOnAnyCase ?? false;
    const exitOnFail = this.config.exitOnFail ?? true;

    if (versions.length < 1)
      throw new Error("At least one version is required");
    if (tests.length === 0)
      throw new Error("At least one test case is required");

    for (const v of versions) {
      if (!v.template.includes("{{input}}")) {
        throw new Error(`Version "${v.label}" template must contain {{input}}`);
      }
    }

    const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
    await validateApiKey(this.config.apiKey, baseUrl);

    let providerResults: ProviderRunResult[];
    try {
      providerResults = await Promise.all(
        this.providers.map((providerConfig) =>
          runForProvider(versions, tests, providerConfig, concurrency),
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      printError(message);
      throw err;
    }

    // Compute overall score — avg across all versions and providers
    const allVersionResults = providerResults.flatMap((p) => p.versions);
    const overallScore =
      allVersionResults.length > 0
        ? allVersionResults.reduce((sum, v) => sum + v.score, 0) /
          allVersionResults.length
        : 0;

    // Best provider
    const bestProvider = providerResults.reduce((best, p) => {
      const topScore = Math.max(...p.versions.map((v) => v.score));
      const bestScore = Math.max(...best.versions.map((v) => v.score));
      return topScore > bestScore ? p : best;
    }).provider;

    // Most-winning version
    const winCounts: Record<string, number> = {};
    for (const p of providerResults) {
      winCounts[p.winner] = (winCounts[p.winner] ?? 0) + 1;
    }
    const bestVersion = Object.entries(winCounts).sort(
      (a, b) => b[1] - a[1],
    )[0][0];

    // Determine pass/fail
    const report = this.computeReport(
      providerResults,
      overallScore,
      failOnThreshold,
      failOnAnyCase,
    );

    const result: CompareResult = {
      providers: providerResults,
      summary: {
        bestProvider,
        bestVersion,
        overallScore: Math.round(overallScore * 10) / 10,
        report,
      },
    };

    printResults(result);

    if (telemetry) {
      void this.sendTelemetry(result, baseUrl);
    }

    // Exit with code 1 if failed and exitOnFail is true
    if (!report.passed && exitOnFail) {
      process.exit(1);
    }

    return result;
  }

  private computeReport(
    providerResults: ProviderRunResult[],
    overallScore: number,
    failOnThreshold?: number,
    failOnAnyCase?: boolean,
  ): ReportStatus {
    // Check failOnAnyCase first
    if (failOnAnyCase) {
      const allResults = providerResults.flatMap((p) =>
        p.versions.flatMap((v) => v.results),
      );
      const failedCase = allResults.find((r) => !r.passed);
      if (failedCase) {
        const desc = failedCase.expectDescription
          ? `expected: ${failedCase.expectDescription}`
          : "a test case failed";
        return {
          passed: false,
          reason: `case failed — ${desc}`,
        };
      }
    }

    // Check threshold
    if (failOnThreshold !== undefined) {
      if (overallScore < failOnThreshold) {
        return {
          passed: false,
          reason: `score ${overallScore.toFixed(1)}% below threshold ${failOnThreshold}%`,
        };
      }
      return {
        passed: true,
        reason: `score ${overallScore.toFixed(1)}% meets threshold ${failOnThreshold}%`,
      };
    }

    // No thresholds set — pass if all cases pass, warn otherwise
    const allResults = providerResults.flatMap((p) =>
      p.versions.flatMap((v) => v.results),
    );
    const totalPassed = allResults.filter((r) => r.passed).length;
    const total = allResults.length;

    if (totalPassed === total) {
      return { passed: true, reason: `all ${total} cases passed` };
    }

    return {
      passed: false,
      reason: `${total - totalPassed} of ${total} cases failed`,
    };
  }

  private async sendTelemetry(
    result: CompareResult,
    baseUrl: string,
  ): Promise<void> {
    try {
      const payload = {
        apiKey: this.config.apiKey,
        providers: result.providers.map((p) => ({
          provider: p.provider,
          model: p.model,
          versions: p.versions.map((v) => ({
            label: v.label,
            score: v.score,
            passedCases: v.passedCases,
            totalCases: v.totalCases,
            avgLatencyMs: v.avgLatencyMs,
          })),
          winner: p.winner,
        })),
        summary: result.summary,
        sdkVersion,
        source: "sdk",
      };

      const url = new URL("/evals/telemetry", baseUrl);
      const body = JSON.stringify(payload);

      const { default: https } = await import("https");
      const { default: http } = await import("http");
      const lib = url.protocol === "https:" ? https : http;

      await new Promise<void>((resolve) => {
        const req = lib.request(
          {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
            },
          },
          () => resolve(),
        );
        req.on("error", () => resolve());
        req.write(body);
        req.end();
      });
    } catch {
      // Telemetry never throws
    }
  }
}
