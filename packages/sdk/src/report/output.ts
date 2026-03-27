import type { SuiteResult, TestResult, RunResult } from "../types";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const AMBER = "\x1b[33m";

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function padRight(str: string, len: number): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  return str + " ".repeat(Math.max(0, len - stripped.length));
}

function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}

function separator(char = "─", len = 64): string {
  return `${DIM}${char.repeat(len)}${RESET}`;
}

// ─── Live output during run ───────────────────────────────────────────────────

export function printSuiteHeader(suiteName: string): void {
  console.log(`\n${BOLD}${suiteName}${RESET}`);
  console.log(separator());
}

export function printTestResult(test: TestResult): void {
  const icon = test.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const name = padRight(truncate(test.name, 34), 36);
  const duration = `${DIM}${formatMs(test.duration)}${RESET}`;

  // Detect if multiple providers are in play
  const uniqueProviders = [...new Set(test.versions.map((v) => v.provider))];
  const multiProvider = uniqueProviders.length > 1;

  // Version results on same line — show provider/label when multiple providers
  const versionParts = test.versions.map((v) => {
    const color = scoreColor(v.score);
    const score = `${color}${v.score.toFixed(0)}%${RESET}`;
    const latency = `${DIM}${formatMs(v.avgLatencyMs)}${RESET}`;
    const label = multiProvider ? `${v.provider}/${v.label}` : v.label;
    return `${DIM}${label}${RESET} ${score} ${latency}`;
  });

  console.log(`  ${icon} ${name}${versionParts.join("   ")}   ${duration}`);

  // Show fail reasons + full output on failure
  for (const v of test.versions) {
    for (const r of v.results) {
      if (!r.passed) {
        const label = multiProvider ? `${v.provider}/${v.label}` : v.label;

        // Reason line
        let reason = "";
        if (r.score !== undefined && r.reason) {
          if (r.judgeScores && r.judgeScores.length > 1) {
            const individualScores = r.judgeScores
              .map((j) =>
                j.score === -1
                  ? `${j.provider}=ERR`
                  : `${j.provider}=${j.score}`,
              )
              .join(" ");
            const closestReason =
              r.judgeScores.find((j) => Math.abs(j.score - r.score!) < 1)
                ?.reason ?? r.reason;
            reason = `llm_judge [${individualScores}] → avg ${r.score}/10 — ${truncate(closestReason, 60)}`;
          } else {
            reason = `llm_judge ${r.score}/10 — ${truncate(r.reason, 65)}`;
          }
        } else if (r.expectDescription) {
          reason = `expected: ${r.expectDescription}`;
        }

        // File path if available (set by CLI via PHASIO_TEST_FILE env var)
        const testFile = process.env.PHASIO_TEST_FILE;

        if (reason) {
          const fileSuffix = testFile ? ` ${DIM}(${testFile})${RESET}` : "";
          console.log(
            `       ${DIM}${padRight(label, 14)}${RED}${reason}${RESET}${fileSuffix}`,
          );
        }

        // Show full model output — no truncation, developer needs to see everything
        if (r.output) {
          const lines = r.output.trim().split("\n");
          console.log(
            `       ${DIM}${padRight("", 14)}┌─ output ${"─".repeat(50)}${RESET}`,
          );
          for (const line of lines) {
            console.log(`       ${DIM}${padRight("", 14)}│ ${line}${RESET}`);
          }
          console.log(
            `       ${DIM}${padRight("", 14)}└${"─".repeat(58)}${RESET}`,
          );
        }
      }
    }
  }
}

// ─── Final summary table ──────────────────────────────────────────────────────

export function printRunSummary(run: RunResult): void {
  const W = 72;
  const col1 = 38;
  const col2 = 10;
  const col3 = 14;
  const col4 = 10;

  console.log("");
  console.log("═".repeat(W));
  console.log(`${BOLD} Test Results${RESET}`);
  console.log("═".repeat(W));
  console.log("");
  console.log(
    ` ${BOLD}${padRight("Suite", col1)}${padRight("Tests", col2)}${padRight("Results", col3)}${padRight("Time", col4)}${RESET}`,
  );
  console.log(` ${"─".repeat(W - 1)}`);

  for (const suite of run.suites) {
    const icon = suite.skipped
      ? `${AMBER}○${RESET}`
      : suite.passed
        ? `${GREEN}✓${RESET}`
        : `${RED}✗${RESET}`;

    const name = padRight(truncate(suite.name, col1 - 3), col1 - 2);

    const tests = suite.skipped
      ? padRight(`${AMBER}${suite.totalTests} tests${RESET}`, col2 + 9)
      : padRight(`${suite.passedTests}/${suite.totalTests}`, col2);

    const results = suite.skipped
      ? padRight(`${AMBER}skipped${RESET}`, col3 + 9)
      : suite.failedTests > 0
        ? padRight(`${RED}${suite.failedTests} failed${RESET}`, col3 + 9)
        : padRight(`${GREEN}all passed${RESET}`, col3 + 9);

    const time = suite.skipped
      ? `${DIM}—${RESET}`
      : `${DIM}${formatMs(suite.duration)}${RESET}`;

    console.log(` ${icon} ${name}${tests}${results}${time}`);

    for (const test of suite.tests) {
      if (!test.passed) {
        console.log(`      ${RED}✗${RESET} ${DIM}${test.name}${RESET}`);
      }
    }
  }

  console.log(` ${"─".repeat(W - 1)}`);

  const nonSkippedSuites = run.suites.filter((s) => !s.skipped);
  const skippedCount = run.suites.filter((s) => s.skipped).length;
  const totalLabel = run.passed
    ? padRight(`${GREEN}${BOLD}all passed${RESET}`, col3 + 9)
    : padRight(`${RED}${BOLD}${run.failedTests} failed${RESET}`, col3 + 9);

  console.log(
    ` ${BOLD}${padRight("Total", col1)}${RESET}${padRight(`${run.passedTests}/${run.totalTests}`, col2)}${totalLabel}${DIM}${formatMs(run.duration)}${RESET}`,
  );

  if (skippedCount > 0) {
    console.log(
      ` ${DIM}${skippedCount} suite${skippedCount !== 1 ? "s" : ""} skipped${RESET}`,
    );
  }

  console.log("");
  console.log("═".repeat(W));

  if (run.passed) {
    if (skippedCount > 0) {
      console.log(
        ` ${GREEN}${BOLD}✓ All suites passed${RESET} ${DIM}(${skippedCount} skipped)${RESET}`,
      );
    } else {
      console.log(` ${GREEN}${BOLD}✓ All suites passed${RESET}`);
    }
  } else {
    const failedSuites = nonSkippedSuites.filter((s) => !s.passed).length;
    console.log(
      ` ${RED}${BOLD}✗ ${run.failedTests} test${run.failedTests !== 1 ? "s" : ""} failed in ${failedSuites} suite${failedSuites !== 1 ? "s" : ""}${RESET}` +
        (skippedCount > 0 ? ` ${DIM}(${skippedCount} skipped)${RESET}` : ""),
    );
  }

  console.log("═".repeat(W));
  console.log("");
}

export function printError(message: string): void {
  console.error(`${RED}${BOLD}Phasio error:${RESET} ${message}`);
}
