import https from "https";
import http from "http";
import type { ProviderConfig } from "../types";
import { callLlm } from "../core/llm";
import { hashTemplate } from "./telemetry";

const DEFAULT_BASE_URL =
  process.env.PHASIO_BASE_URL ?? "https://api.phasio.dev";

export interface EvaluateOptions {
  /** Project-scoped API key from Phasio dashboard */
  projectKey: string;
  /** Matches Prompt.slug in the dashboard */
  promptSlug: string;
  /** Your prompt template — must contain {{input}} — never sent to Phasio */
  template: string;
  /** Your LLM API key — used locally, never sent to Phasio */
  llmKey: string;
  provider?: "openai" | "anthropic";
  model?: string;
  /** Label for this version in analytics — e.g. "v3" or "gpt4-tuned" */
  versionLabel?: string;
  /** Override API base URL for local dev/testing */
  baseUrl?: string;
}

export interface EvaluateCase {
  caseId: string;
  passed: boolean;
  output: string;
  latencyMs: number;
  score?: number;
  reason?: string;
}

export interface EvaluateResult {
  passed: boolean;
  score: number;
  passedCases: number;
  totalCases: number;
  versionLabel: string;
  evalRunId: string;
  cases: EvaluateCase[];
  durationMs: number;
}

interface FetchedCase {
  caseId: string;
  input: string;
  checkType: string;
  checkValue: string;
}

interface FetchedSuite {
  suiteId: string;
  suiteName: string;
  cases: FetchedCase[];
}

interface FetchCasesResponse {
  promptId: string;
  promptSlug: string;
  suites: FetchedSuite[];
}

/**
 * Run your prompt template against Phasio test cases and evaluate the outputs.
 * LLM calls run on your server with your key. Only outputs (not the template or key) are sent to Phasio.
 *
 * @example
 * const result = await evaluate({
 *   projectKey: process.env.PHASIO_PROJECT_KEY,
 *   promptSlug: 'ticket-classifier',
 *   template: 'Classify this ticket: {{input}}',
 *   llmKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o-mini',
 *   versionLabel: 'v4',
 * });
 * if (!result.passed) throw new Error(`Prompt quality check failed: ${result.score}%`);
 */
export async function evaluate(
  options: EvaluateOptions,
): Promise<EvaluateResult> {
  const start = Date.now();
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const versionLabel = options.versionLabel ?? "default";
  const provider = options.provider ?? "openai";
  const model = options.model ?? "gpt-4o-mini";

  // Step 1: Fetch test cases from Phasio
  const casesData = await fetchCases(
    options.projectKey,
    options.promptSlug,
    baseUrl,
  );

  if (!casesData.suites || casesData.suites.length === 0) {
    throw new Error(
      `No test suites found for prompt "${options.promptSlug}". ` +
        `Create test suites in the Phasio dashboard first.`,
    );
  }

  const allCases = casesData.suites.flatMap((s) => s.cases);

  if (allCases.length === 0) {
    throw new Error(
      `Test suites exist for "${options.promptSlug}" but contain no test cases.`,
    );
  }

  // Step 2: Run LLM locally — key never leaves this process
  const providerConfig: ProviderConfig = {
    provider,
    llmKey: options.llmKey,
    model,
  };

  const caseOutputs = await Promise.all(
    allCases.map(async (c) => {
      const prompt = options.template.replace("{{input}}", c.input);
      const { output, latencyMs } = await callLlm(prompt, providerConfig);
      return { caseId: c.caseId, output, latencyMs };
    }),
  );

  // Step 3: Hash template — only the hash goes to Phasio, never the raw template
  const templateHash = hashTemplate(options.template);

  // Step 4: Send outputs to Phasio for evaluation
  const result = await postEvaluateOutputs(
    {
      projectKey: options.projectKey,
      promptSlug: options.promptSlug,
      versionLabel,
      templateHash,
      cases: caseOutputs,
    },
    baseUrl,
  );

  return { ...result, durationMs: Date.now() - start };
}

async function fetchCases(
  projectKey: string,
  promptSlug: string,
  baseUrl: string,
): Promise<FetchCasesResponse> {
  return httpRequest<FetchCasesResponse>(
    "GET",
    `${baseUrl}/prompts/sdk-cases/${encodeURIComponent(projectKey)}/${encodeURIComponent(promptSlug)}`,
    null,
  );
}

async function postEvaluateOutputs(
  payload: {
    projectKey: string;
    promptSlug: string;
    versionLabel: string;
    templateHash: string;
    cases: Array<{ caseId: string; output: string; latencyMs: number }>;
  },
  baseUrl: string,
): Promise<Omit<EvaluateResult, "durationMs">> {
  return httpRequest<Omit<EvaluateResult, "durationMs">>(
    "POST",
    `${baseUrl}/evals/evaluate-outputs`,
    payload,
  );
}

function httpRequest<T>(
  method: string,
  fullUrl: string,
  body: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(fullUrl);
    const lib = url.protocol === "https:" ? https : http;
    const bodyStr = body !== null ? JSON.stringify(body) : null;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(bodyStr && { "Content-Length": Buffer.byteLength(bodyStr) }),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(
                new Error(`evaluate(): invalid JSON response from Phasio`),
              );
            }
          } else if (res.statusCode === 401) {
            reject(new Error("evaluate(): invalid or revoked projectKey"));
          } else if (res.statusCode === 404) {
            reject(
              new Error(
                `evaluate(): prompt not found — check promptSlug matches your dashboard`,
              ),
            );
          } else {
            reject(
              new Error(
                `evaluate(): Phasio API error (${res.statusCode ?? "unknown"}): ${data}`,
              ),
            );
          }
        });
      },
    );

    req.on("error", (err: Error) =>
      reject(new Error(`evaluate(): network error — ${err.message}`)),
    );
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("evaluate(): request timed out after 30s"));
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
