import type {
  CompareResult,
  ProviderRunResult,
  VersionResult,
  CaseResult,
  ReportStatus,
} from "./types";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const AMBER = "\x1b[33m";
const CYAN = "\x1b[36m";

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function pad(str: string, len: number): string {
  return str.padEnd(len, " ").slice(0, len);
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function separator(char = "─", len = 60): string {
  return `${DIM}${char.repeat(len)}${RESET}`;
}

export function printResults(result: CompareResult): void {
  const providers = result.providers;
  const allVersionLabels = [
    ...new Set(providers.flatMap((p) => p.versions.map((v) => v.label))),
  ];

  console.log("");
  console.log(`${BOLD}Phasio${RESET} ${DIM}— eval run${RESET}`);
  console.log(separator());
  console.log(
    `${DIM}${providers.length} provider(s) · ${allVersionLabels.length} version(s) · ${providers[0]?.versions[0]?.totalCases ?? 0} tests${RESET}`,
  );
  console.log("");

  for (const providerResult of providers) {
    printProviderResult(providerResult);
  }

  // Cross-provider summary (only if multiple providers)
  if (providers.length > 1) {
    console.log(`${BOLD}Summary${RESET}`);
    console.log(separator());
    console.log(
      `  Best provider : ${CYAN}${result.summary.bestProvider}${RESET}`,
    );
    console.log(
      `  Best version  : ${CYAN}${result.summary.bestVersion}${RESET}`,
    );
    console.log(
      `  Overall score : ${scoreColor(result.summary.overallScore)}${result.summary.overallScore.toFixed(1)}%${RESET}`,
    );
    console.log("");
  }

  // Final PASS / FAIL banner
  printReport(result.summary.report);
}

function printProviderResult(result: ProviderRunResult): void {
  console.log(
    `${BOLD}${result.provider}${RESET} ${DIM}(${result.model})${RESET}`,
  );
  console.log(separator());

  const totalCases = result.versions[0]?.totalCases ?? 0;
  const COL = 16;

  // Header row
  const header = result.versions.map((v) => pad(v.label, COL)).join("");
  console.log(`  ${pad("", 8)}${header}`);

  // Per-case rows with reason on fail
  for (let i = 0; i < totalCases; i++) {
    const firstResult = result.versions[0]?.results[i];
    const caseLabel = firstResult?.label ?? `case ${i + 1}`;

    const cells = result.versions.map((v) => {
      const r: CaseResult = v.results[i];
      if (!r) return pad("", COL);
      const icon = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      return pad(`${icon} ${formatMs(r.latencyMs)}`, COL + 9);
    });
    console.log(`  ${pad(caseLabel, 8)}${cells.join("")}`);

    // Show fail reason inline for each version
    for (const v of result.versions) {
      const r: CaseResult = v.results[i];
      if (r && !r.passed) {
        let reason = "";
        if (r.expectDescription) {
          reason = `expected: ${r.expectDescription}`;
        } else if (r.score !== undefined && r.reason) {
          reason = `llm_judge: ${r.score}/10 — ${r.reason}`;
        }
        if (reason) {
          console.log(`  ${DIM}  ${v.label}: ${reason}${RESET}`);
        }
      }
    }
  }

  console.log("");

  // Score row
  const scoreCells = result.versions.map((v: VersionResult) => {
    const color = scoreColor(v.score);
    return pad(`${color}${v.score.toFixed(0)}%${RESET}`, COL + 9);
  });
  console.log(`  ${pad("score", 8)}${scoreCells.join("")}`);

  // Latency row
  const latencyCells = result.versions.map((v: VersionResult) =>
    pad(`${DIM}${formatMs(v.avgLatencyMs)} avg${RESET}`, COL + 9),
  );
  console.log(`  ${pad("latency", 8)}${latencyCells.join("")}`);

  console.log("");

  // Winner line
  const winnerVersion = result.versions.find((v) => v.label === result.winner);
  const fastestVersion = result.versions.find(
    (v) => v.label === result.fastest,
  );

  const allTied = result.versions.every(
    (v) => v.score === result.versions[0].score,
  );
  if (allTied) {
    console.log(
      `  ${AMBER}= Tie${RESET} on accuracy — ${CYAN}${result.fastest}${RESET} faster (${formatMs(fastestVersion?.avgLatencyMs ?? 0)} avg)`,
    );
  } else {
    console.log(
      `  ${GREEN}✓ ${result.winner} wins${RESET} (${winnerVersion?.score.toFixed(0)}% · ${formatMs(winnerVersion?.avgLatencyMs ?? 0)} avg)`,
    );
  }

  console.log("");
}

function printReport(report: ReportStatus): void {
  console.log(separator("─"));
  if (report.passed) {
    console.log(
      `${GREEN}${BOLD}  PASS${RESET}  ${DIM}${report.reason}${RESET}`,
    );
  } else {
    console.log(`${RED}${BOLD}  FAIL${RESET}  ${DIM}${report.reason}${RESET}`);
  }
  console.log(separator("─"));
  console.log("");
}

export function printError(message: string): void {
  console.error(`${RED}${BOLD}Phasio error:${RESET} ${message}`);
}
