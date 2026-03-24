import { version as sdkVersion } from "../package.json";
import { validateApiKey } from "./auth";
import { runTestAcrossVersions, runHooks } from "./core/runner";
import {
  printError,
  printRunSummary,
  printSuiteHeader,
  printTestResult,
} from "./report/output";
import {
  clearSuites,
  consumeCurrentHooks,
  getRegisteredSuites,
  registerAfterAll,
  registerAfterEach,
  registerBeforeAll,
  registerBeforeEach,
  registerSuite,
  resetCurrentHooks,
  setOnlyMode,
  isOnlyMode,
} from "./suite/context";
import {
  getGlobalConfig,
  resolveProviders,
  resolveJudgeProviders,
  resolveVersions,
} from "./config";
import type {
  HookFn,
  PromptVersion,
  RunResult,
  SuiteResult,
  TestDefinition,
  TestResult,
} from "./types";

const DEFAULT_BASE_URL = process.env.PHASIO_BASE_URL ?? "https://api.phasio.in";

interface TestFn {
  (name: string, definition: Omit<TestDefinition, "name">): void;
  only: (name: string, definition: Omit<TestDefinition, "name">) => void;
  skip: (name: string, definition: Omit<TestDefinition, "name">) => void;
}

// ─── pe singleton ─────────────────────────────────────────────────────────────
// pe is a lightweight object — it collects tests during describe() callbacks.
// All config is read from globalConfig at run() time, not at construction time.
// This allows test files to import pe before defineConfig() has been called.

class PhasioRunner {
  private currentSuiteTests: TestDefinition[] = [];

  test: TestFn = Object.assign(
    (name: string, definition: Omit<TestDefinition, "name">): void => {
      this.currentSuiteTests.push({
        name,
        ...definition,
        only: false,
        skip: false,
      });
    },
    {
      only: (name: string, definition: Omit<TestDefinition, "name">): void => {
        this.currentSuiteTests.push({
          name,
          ...definition,
          only: true,
          skip: false,
        });
      },
      skip: (name: string, definition: Omit<TestDefinition, "name">): void => {
        this.currentSuiteTests.push({
          name,
          ...definition,
          only: false,
          skip: true,
        });
      },
    },
  );

  _flushTests(): TestDefinition[] {
    const tests = [...this.currentSuiteTests];
    this.currentSuiteTests = [];
    return tests;
  }

  async run(): Promise<RunResult> {
    const config = getGlobalConfig();
    const providers = resolveProviders(config);
    const judgeProviders = resolveJudgeProviders(config);
    const globalVersions = resolveVersions(config);

    // Validate providers
    if (providers.length === 0)
      throw new Error("At least one provider must be configured");
    for (const p of providers) {
      if (!p.llmKey)
        throw new Error(`Missing llmKey for provider "${p.provider}"`);
      if (!p.model)
        throw new Error(`Missing model for provider "${p.provider}"`);
    }
    if (judgeProviders.length === 0)
      throw new Error("At least one judge provider must be configured");
    for (const j of judgeProviders) {
      if (!j.llmKey)
        throw new Error(`Missing llmKey for judgeProvider "${j.provider}"`);
      if (!j.model)
        throw new Error(`Missing model for judgeProvider "${j.provider}"`);
    }

    const suites = getRegisteredSuites();
    const inOnlyMode = isOnlyMode();
    const baseUrl = DEFAULT_BASE_URL;
    const exitOnFail = config.exitOnFail ?? true;
    const concurrency = 5;
    const runStart = Date.now();

    // Auth check
    try {
      await validateApiKey(config.apiKey, baseUrl);
    } catch (err) {
      printError("Auth failed — check your API key");
      if (exitOnFail) process.exit(1);
      throw err;
    }

    const suitesToRun = suites.filter((s) => {
      if (s.skip) return false;
      if (inOnlyMode && !s.only) return false;
      return true;
    });

    const suiteResults: SuiteResult[] = [];

    for (const suite of suitesToRun) {
      const suiteStart = Date.now();
      const testResults: TestResult[] = [];

      printSuiteHeader(suite.name);

      // Run beforeAll hooks
      await runHooks(suite.hooks.beforeAll);

      const suiteVersions = globalVersions;
      const hasOnlyTest = suite.tests.some((t) => t.only);
      const testsToRun = suite.tests.filter((t) => {
        if (t.skip) return false;
        if (hasOnlyTest && !t.only) return false;
        return true;
      });

      for (const test of testsToRun) {
        const testStart = Date.now();

        // Run beforeEach hooks
        await runHooks(suite.hooks.beforeEach);

        if (suiteVersions.length === 0) {
          printError(
            `No versions defined for test "${test.name}" in suite "${suite.name}". ` +
              `Set versions in phasio.config.ts.`,
          );
          await runHooks(suite.hooks.afterEach);
          continue;
        }

        let templatesValid = true;
        for (const v of suiteVersions) {
          if (!v.template.includes("{{input}}")) {
            printError(`Version "${v.label}" template must contain {{input}}`);
            templatesValid = false;
          }
        }
        if (!templatesValid) {
          await runHooks(suite.hooks.afterEach);
          continue;
        }

        const versionResults = await runTestAcrossVersions(
          test,
          suiteVersions,
          providers,
          judgeProviders,
          concurrency,
        );

        const testPassed = this.evaluateTestPass(versionResults, config);

        const testResult: TestResult = {
          name: test.name,
          passed: testPassed,
          versions: versionResults,
          duration: Date.now() - testStart,
        };

        printTestResult(testResult);
        testResults.push(testResult);

        // Run afterEach hooks
        await runHooks(suite.hooks.afterEach);
      }

      // Run afterAll hooks
      await runHooks(suite.hooks.afterAll);

      const suitePassed = testResults.every((t) => t.passed);
      suiteResults.push({
        name: suite.name,
        passed: suitePassed,
        totalTests: testResults.length,
        passedTests: testResults.filter((t) => t.passed).length,
        failedTests: testResults.filter((t) => !t.passed).length,
        duration: Date.now() - suiteStart,
        tests: testResults,
      });
    }

    // Skipped suites
    const skippedSuites = suites.filter((s) => {
      if (s.skip) return true;
      if (inOnlyMode && !s.only) return true;
      return false;
    });

    for (const suite of skippedSuites) {
      suiteResults.push({
        name: suite.name,
        passed: true,
        totalTests: suite.tests.length,
        passedTests: 0,
        failedTests: 0,
        skipped: true,
        duration: 0,
        tests: [],
      });
    }

    const totalTests = suiteResults.reduce((s, r) => s + r.totalTests, 0);
    const passedTests = suiteResults.reduce((s, r) => s + r.passedTests, 0);
    const failedTests = suiteResults.reduce((s, r) => s + r.failedTests, 0);
    const allPassed = failedTests === 0;

    const runResult: RunResult = {
      suites: suiteResults,
      passed: allPassed,
      totalTests,
      passedTests,
      failedTests,
      duration: Date.now() - runStart,
    };

    printRunSummary(runResult);

    if (config.telemetry) {
      void this.sendTelemetry(runResult, baseUrl);
    }

    clearSuites();

    if (!allPassed && exitOnFail) {
      process.exit(1);
    }

    return runResult;
  }

  private evaluateTestPass(
    versionResults: import("./types").VersionResult[],
    config: import("./types").PhasioConfig,
  ): boolean {
    const { failOnThreshold, failOnAnyCase } = config;

    if (failOnAnyCase) {
      return versionResults.every((v) => v.results.every((r) => r.passed));
    }

    if (failOnThreshold !== undefined) {
      const avgScore =
        versionResults.reduce((s, v) => s + v.score, 0) / versionResults.length;
      return avgScore >= failOnThreshold;
    }

    const totalCases = versionResults.reduce((s, v) => s + v.totalCases, 0);
    const passedCases = versionResults.reduce((s, v) => s + v.passedCases, 0);
    return passedCases === totalCases;
  }

  private async sendTelemetry(run: RunResult, baseUrl: string): Promise<void> {
    try {
      const config = getGlobalConfig();
      const payload = {
        apiKey: config.apiKey,
        suites: run.suites.map((s) => ({
          name: s.name,
          totalTests: s.totalTests,
          passedTests: s.passedTests,
          duration: s.duration,
        })),
        passed: run.passed,
        totalTests: run.totalTests,
        passedTests: run.passedTests,
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

// Singleton — imported directly by test files
export const pe = new PhasioRunner();

// ─── describe ─────────────────────────────────────────────────────────────────

export function describe(name: string, callback: () => void): void {
  _registerSuite(name, callback, false, false);
}

describe.only = function (name: string, callback: () => void): void {
  setOnlyMode();
  _registerSuite(name, callback, true, false);
};

describe.skip = function (name: string, callback: () => void): void {
  _registerSuite(name, callback, false, true);
};

function _registerSuite(
  name: string,
  callback: () => void,
  only: boolean,
  skip: boolean,
): void {
  resetCurrentHooks();
  pe._flushTests(); // clear any stale tests from previous suite
  callback();
  const tests = pe._flushTests();
  const hooks = consumeCurrentHooks();
  registerSuite({ name, tests, only, skip, hooks });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function beforeAll(fn: HookFn): void {
  registerBeforeAll(fn);
}

export function beforeEach(fn: HookFn): void {
  registerBeforeEach(fn);
}

export function afterAll(fn: HookFn): void {
  registerAfterAll(fn);
}

export function afterEach(fn: HookFn): void {
  registerAfterEach(fn);
}
