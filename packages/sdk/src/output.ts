import type {
  CompareResult,
  ProviderRunResult,
  VersionResult,
  CaseResult,
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

function passIcon(passed: boolean): string {
  return passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
}

function pad(str: string, len: number): string {
  return str.padEnd(len, " ").slice(0, len);
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function printResults(result: CompareResult): void {
  const providers = result.providers;
  const allVersionLabels = [
    ...new Set(providers.flatMap((p) => p.versions.map((v) => v.label))),
  ];

  console.log("");
  console.log(`${BOLD}PromptEval${RESET}`);
  console.log(`${DIM}${"─".repeat(60)}${RESET}`);
  console.log(
    `${DIM}${providers.length} provider(s) · ${allVersionLabels.length} version(s) · ${providers[0]?.versions[0]?.totalCases ?? 0} tests${RESET}`,
  );
  console.log("");

  for (const providerResult of providers) {
    printProviderResult(providerResult, allVersionLabels);
  }

  // Cross-provider summary (only if multiple providers)
  if (providers.length > 1) {
    console.log(`${BOLD}Summary${RESET}`);
    console.log(`${DIM}${"─".repeat(60)}${RESET}`);
    console.log(
      `  Best provider : ${CYAN}${result.summary.bestProvider}${RESET}`,
    );
    console.log(
      `  Best version  : ${CYAN}${result.summary.bestVersion}${RESET}`,
    );
    console.log("");
  }
}

function printProviderResult(
  result: ProviderRunResult,
  _allVersionLabels: string[],
): void {
  console.log(
    `${BOLD}${result.provider}${RESET} ${DIM}(${result.model})${RESET}`,
  );
  console.log(`${DIM}${"─".repeat(60)}${RESET}`);

  const totalCases = result.versions[0]?.totalCases ?? 0;
  const COL = 16; // column width

  // Header row
  const header = result.versions.map((v) => pad(v.label, COL)).join("");
  console.log(`  ${pad("", 8)}${header}`);

  // Case by case rows
  for (let i = 0; i < totalCases; i++) {
    const caseLabel = result.versions[0]?.results[i]?.label ?? `case ${i + 1}`;
    const cells = result.versions.map((v) => {
      const r: CaseResult = v.results[i];
      if (!r) return pad("", COL);
      const icon = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      return pad(`${icon} ${formatMs(r.latencyMs)}`, COL + 9); // +9 for ANSI escape chars
    });
    console.log(`  ${pad(caseLabel, 8)}${cells.join("")}`);
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

export function printError(message: string): void {
  console.error(`${RED}${BOLD}PromptEval error:${RESET} ${message}`);
}
