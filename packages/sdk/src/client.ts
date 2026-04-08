import { version as sdkVersion } from '../package.json';
import { validateApiKey } from './auth';
import { runTestAcrossVersions, runHooks } from './core/runner';
import {
  printError,
  printRunSummary,
  printSuiteHeader,
  printTestResult,
} from './report/output';
import {
  clearSuites,
  consumeCurrentHooks,
  consumeCurrentRules,
  getRegisteredSuites,
  registerAfterAll,
  registerAfterEach,
  registerBeforeAll,
  registerBeforeEach,
  registerSuite,
  resetCurrentHooks,
  setCurrentRules,
  setOnlyMode,
  isOnlyMode,
} from './suite/context';
import {
  getGlobalConfig,
  resolveApiKey,
  resolveProviders,
  resolveJudgeProviders,
  resolveVersions,
  resolveTelemetryConfig,
} from './config';
import { buildTelemetryPayload, sendTelemetry } from './api/telemetry';
import type {
  HookFn,
  PromptVersion,
  RunResult,
  SuiteResult,
  SuiteOptions,
  TestDefinition,
  TestResult,
} from './types';

const DEFAULT_BASE_URL = process.env.PHASIO_BASE_URL ?? 'https://api.phasio.dev';
const MAX_CONCURRENT_LLM_CALLS = 5;

// ─── TestFn interface ─────────────────────────────────────────────────────────

interface TestFn {
  (name: string, definition: Omit<TestDefinition, 'name'>): void;
  only: (name: string, definition: Omit<TestDefinition, 'name'>) => void;
  skip: (name: string, definition: Omit<TestDefinition, 'name'>) => void;
}

// ─── PhasioRunner ─────────────────────────────────────────────────────────────

class PhasioRunner {
  private currentSuiteTests: TestDefinition[] = [];

  /**
   * Register a test case inside a describe() block.
   *
   * @example
   * pe.test('billing complaint', {
   *   input: 'You charged me twice',
   *   expect: 'Identifies as a billing issue',
   * })
   */
  test: TestFn = Object.assign(
    (name: string, definition: Omit<TestDefinition, 'name'>): void => {
      this.currentSuiteTests.push({ name, ...definition, only: false, skip: false });
    },
    {
      only: (name: string, definition: Omit<TestDefinition, 'name'>): void => {
        this.currentSuiteTests.push({ name, ...definition, only: true, skip: false });
      },
      skip: (name: string, definition: Omit<TestDefinition, 'name'>): void => {
        this.currentSuiteTests.push({ name, ...definition, only: false, skip: true });
      },
    },
  );

  /**
   * Define suite-level rules applied as natural language assertions to every test.
   * Call inside a describe() block before pe.test() calls.
   *
   * @example
   * describe('Classifier', () => {
   *   pe.rules([
   *     'Response must always acknowledge the issue',
   *     'Response must be under 3 sentences',
   *   ])
   *   pe.test('billing', { input: '...', expect: 'billing issue' })
   * })
   */
  rules(assertions: string[]): void {
    setCurrentRules(assertions);
  }

  // Lifecycle hooks
  beforeAll(fn: HookFn): void { registerBeforeAll(fn); }
  afterAll(fn: HookFn): void  { registerAfterAll(fn); }
  beforeEach(fn: HookFn): void { registerBeforeEach(fn); }
  afterEach(fn: HookFn): void  { registerAfterEach(fn); }

  _flushTests(): TestDefinition[] {
    const tests = [...this.currentSuiteTests];
    this.currentSuiteTests = [];
    return tests;
  }

  // ─── run() ─────────────────────────────────────────────────────────────────

  async run(): Promise<RunResult> {
    const config = getGlobalConfig();
    const apiKey = resolveApiKey(config);
    const globalProviders = resolveProviders(config);
    const judgeProviders = resolveJudgeProviders(config);
    const globalVersions = resolveVersions(config);
    const telemetryConfig = resolveTelemetryConfig(config);
    const exitOnFail = config.exitOnFail ?? true;
    const baseUrl = DEFAULT_BASE_URL;

    // Validate providers
    if (globalProviders.length === 0) {
      throw new Error('At least one provider must be configured');
    }
    for (const p of globalProviders) {
      if (!p.llmKey) throw new Error(`Missing llmKey for provider "${p.provider}"`);
      if (!p.model) throw new Error(`Missing model for provider "${p.provider}"`);
    }
    if (judgeProviders.length === 0) {
      throw new Error('At least one judge provider must be configured');
    }

    // Auth check — warns and continues if offline
    try {
      await validateApiKey(apiKey, baseUrl);
    } catch (err) {
      printError('Auth failed — check your API key');
      if (exitOnFail) process.exit(1);
      throw err;
    }

    const suites = getRegisteredSuites();
    const inOnlyMode = isOnlyMode();
    const runStart = Date.now();

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

      await runHooks(suite.hooks.beforeAll);

      // Suite-level version override — falls back to global config versions
      const suiteVersions: PromptVersion[] =
        suite.options.versions && suite.options.versions.length > 0
          ? suite.options.versions
          : globalVersions;

      // Suite-level provider override — falls back to global config providers
      const suiteProviders =
        suite.options.providers && suite.options.providers.length > 0
          ? suite.options.providers
          : globalProviders;

      const hasOnlyTest = suite.tests.some((t) => t.only);
      const testsToRun = suite.tests.filter((t) => {
        if (t.skip) return false;
        if (hasOnlyTest && !t.only) return false;
        return true;
      });

      for (const test of testsToRun) {
        const testStart = Date.now();

        await runHooks(suite.hooks.beforeEach);

        if (suiteVersions.length === 0) {
          printError(
            `No versions defined for test "${test.name}" in suite "${suite.name}". ` +
            `Set versions in phasio.config.ts or in describe() options.`,
          );
          await runHooks(suite.hooks.afterEach);
          continue;
        }

        // Validate templates
        let templatesValid = true;
        for (const v of suiteVersions) {
          if (!v.template.includes('{{input}}')) {
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
          suiteProviders,
          judgeProviders,
          suite.rules,
          MAX_CONCURRENT_LLM_CALLS,
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

        await runHooks(suite.hooks.afterEach);
      }

      await runHooks(suite.hooks.afterAll);

      const suitePassed = testResults.every((t) => t.passed);
      suiteResults.push({
        name: suite.name,
        promptSlug: suite.options.promptSlug,
        // Attach suite versions for telemetry payload building
        versions: suite.options.versions,
        passed: suitePassed,
        totalTests: testResults.length,
        passedTests: testResults.filter((t) => t.passed).length,
        failedTests: testResults.filter((t) => !t.passed).length,
        duration: Date.now() - suiteStart,
        tests: testResults,
      } as SuiteResult & { versions?: PromptVersion[] });
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
        promptSlug: suite.options.promptSlug,
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

    // Send telemetry — fire and forget, never blocks
    if (telemetryConfig.enabled) {
      // Build a map of suite name → versions for template hash computation
      const suiteVersionsMap = new Map<string, import('./types').PromptVersion[]>();
      for (const suite of suites) {
        if (suite.options.versions && suite.options.versions.length > 0) {
          suiteVersionsMap.set(suite.name, suite.options.versions);
        }
      }
      const payload = buildTelemetryPayload(runResult, config, sdkVersion, suiteVersionsMap);
      void sendTelemetry(payload, baseUrl);
    }

    clearSuites();

    if (!allPassed && exitOnFail) {
      process.exit(1);
    }

    return runResult;
  }

  private evaluateTestPass(
    versionResults: import('./types').VersionResult[],
    config: import('./types').PhasioConfig,
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
}

// ─── Global singleton ─────────────────────────────────────────────────────────

export const pe = new PhasioRunner();

// ─── describe() ───────────────────────────────────────────────────────────────

type DescribeCallback = () => void;

/**
 * Define a test suite.
 *
 * @example Basic
 * describe('Suite name', () => {
 *   pe.test('test', { input: '...', expect: 'passes the check' })
 * })
 *
 * @example With options (per-suite versions, promptSlug for attribution)
 * describe('Classifier', { promptSlug: 'ticket-classifier', versions: [...] }, () => {
 *   pe.test('billing', { input: '...', expect: 'billing issue' })
 * })
 */
export function describe(name: string, fn: DescribeCallback): void;
export function describe(name: string, options: SuiteOptions, fn: DescribeCallback): void;
export function describe(
  name: string,
  optionsOrFn: SuiteOptions | DescribeCallback,
  fn?: DescribeCallback,
): void {
  const options: SuiteOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const callback: DescribeCallback = typeof optionsOrFn === 'function' ? optionsOrFn : fn!;
  _registerSuite(name, options, callback, false, false);
}

describe.only = function (
  name: string,
  optionsOrFn: SuiteOptions | DescribeCallback,
  fn?: DescribeCallback,
): void {
  setOnlyMode();
  const options: SuiteOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const callback: DescribeCallback = typeof optionsOrFn === 'function' ? optionsOrFn : fn!;
  _registerSuite(name, options, callback, true, false);
};

describe.skip = function (
  name: string,
  optionsOrFn: SuiteOptions | DescribeCallback,
  fn?: DescribeCallback,
): void {
  const options: SuiteOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const callback: DescribeCallback = typeof optionsOrFn === 'function' ? optionsOrFn : fn!;
  _registerSuite(name, options, callback, false, true);
};

function _registerSuite(
  name: string,
  options: SuiteOptions,
  callback: DescribeCallback,
  only: boolean,
  skip: boolean,
): void {
  resetCurrentHooks();
  pe._flushTests(); // clear stale tests from previous suite
  setCurrentRules([]); // clear stale rules
  callback();
  const tests = pe._flushTests();
  const rules = consumeCurrentRules();
  const hooks = consumeCurrentHooks();
  registerSuite({ name, options, tests, rules, only, skip, hooks });
}

// ─── Hooks (module-level for backwards compat) ────────────────────────────────

export function beforeAll(fn: HookFn): void { registerBeforeAll(fn); }
export function beforeEach(fn: HookFn): void { registerBeforeEach(fn); }
export function afterAll(fn: HookFn): void { registerAfterAll(fn); }
export function afterEach(fn: HookFn): void { registerAfterEach(fn); }
