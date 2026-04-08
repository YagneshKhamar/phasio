import { createHash } from 'crypto';
import https from 'https';
import http from 'http';
import type { RunResult, PhasioConfig, TelemetryPayload, TelemetryRunPayload, PromptVersion } from '../types';

const TEMPLATE_HASH_LENGTH = 16;

/**
 * Hash a template string for telemetry attribution.
 * Only the first 16 chars of sha256 are sent — enough to correlate runs
 * but impossible to reconstruct the original template.
 */
export function hashTemplate(template: string): string {
  return createHash('sha256').update(template).digest('hex').slice(0, TEMPLATE_HASH_LENGTH);
}

/**
 * Build the telemetry payload from a completed run.
 * Privacy guarantee: template text is never included — only its hash.
 */
export function buildTelemetryPayload(
  run: RunResult,
  config: PhasioConfig,
  sdkVersion: string,
  suiteVersionsMap: Map<string, PromptVersion[]> = new Map(),
): TelemetryPayload {
  const apiKey = config.projectKey ?? config.apiKey ?? '';
  const runs: TelemetryRunPayload[] = [];

  for (const suite of run.suites) {
    if (suite.skipped) continue;

    // Collect unique (versionLabel × provider) combinations from test results
    const versionProviderMap = new Map<
      string,
      {
        versionLabel: string;
        provider: string;
        model: string;
        passedCases: number;
        totalCases: number;
        durationMs: number;
      }
    >();

    for (const test of suite.tests) {
      for (const vr of test.versions) {
        const key = `${vr.label}::${vr.provider}`;
        const existing = versionProviderMap.get(key);
        if (existing) {
          existing.passedCases += vr.passedCases;
          existing.totalCases += vr.totalCases;
          existing.durationMs += test.duration;
        } else {
          versionProviderMap.set(key, {
            versionLabel: vr.label,
            provider: vr.provider,
            model: vr.model,
            passedCases: vr.passedCases,
            totalCases: vr.totalCases,
            durationMs: test.duration,
          });
        }
      }
    }

    for (const entry of versionProviderMap.values()) {
      // Check suite-level versions first (passed via suiteVersionsMap), then global config
      const suiteVersionList = suiteVersionsMap.get(suite.name) ?? config.versions ?? [];
      const versionDef = suiteVersionList.find((v: PromptVersion) => v.label === entry.versionLabel);
      const templateHash = versionDef ? hashTemplate(versionDef.template) : 'unknown';

      runs.push({
        promptSlug: suite.promptSlug ?? suite.name,
        versionLabel: entry.versionLabel,
        templateHash,
        provider: entry.provider,
        model: entry.model,
        suiteName: suite.name,
        totalCases: entry.totalCases,
        passedCases: entry.passedCases,
        durationMs: entry.durationMs,
      });
    }
  }

  return {
    apiKey,
    sdkVersion,
    passed: run.passed,
    totalTests: run.totalTests,
    passedTests: run.passedTests,
    durationMs: run.duration,
    runs,
  };
}

/**
 * Send telemetry payload to Phasio API.
 * Fire-and-forget — never throws, never blocks the CI run.
 */
export async function sendTelemetry(
  payload: TelemetryPayload,
  baseUrl: string,
): Promise<void> {
  try {
    const url = new URL('/evals/telemetry', baseUrl);
    const body = JSON.stringify(payload);
    const lib = url.protocol === 'https:' ? https : http;

    await new Promise<void>((resolve) => {
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        () => resolve(),
      );
      req.on('error', () => resolve());
      req.setTimeout(8000, () => { req.destroy(); resolve(); });
      req.write(body);
      req.end();
    });
  } catch {
    // Telemetry never throws — a reporting failure must never break a CI run
  }
}
