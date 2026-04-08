import type { SuiteDefinition, HookFn } from '../types';

// Global suite registry
const suiteRegistry: SuiteDefinition[] = [];
let onlyMode = false;

// Current suite state — collected while describe() callback runs
let currentHooks: SuiteDefinition['hooks'] = {
  beforeAll: [],
  beforeEach: [],
  afterAll: [],
  afterEach: [],
};
let currentRules: string[] = [];

// ─── Registry ─────────────────────────────────────────────────────────────────

export function registerSuite(suite: SuiteDefinition): void {
  suiteRegistry.push(suite);
}

export function getRegisteredSuites(): SuiteDefinition[] {
  return [...suiteRegistry];
}

export function clearSuites(): void {
  suiteRegistry.length = 0;
  onlyMode = false;
  resetCurrentHooks();
  currentRules = [];
}

export function setOnlyMode(): void {
  onlyMode = true;
}

export function isOnlyMode(): boolean {
  return onlyMode;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function registerBeforeAll(fn: HookFn): void {
  currentHooks.beforeAll.push(fn);
}

export function registerBeforeEach(fn: HookFn): void {
  currentHooks.beforeEach.push(fn);
}

export function registerAfterAll(fn: HookFn): void {
  currentHooks.afterAll.push(fn);
}

export function registerAfterEach(fn: HookFn): void {
  currentHooks.afterEach.push(fn);
}

export function resetCurrentHooks(): void {
  currentHooks = {
    beforeAll: [],
    beforeEach: [],
    afterAll: [],
    afterEach: [],
  };
}

export function consumeCurrentHooks(): SuiteDefinition['hooks'] {
  const hooks = { ...currentHooks };
  resetCurrentHooks();
  return hooks;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export function setCurrentRules(rules: string[]): void {
  currentRules = [...rules];
}

export function consumeCurrentRules(): string[] {
  const rules = [...currentRules];
  currentRules = [];
  return rules;
}
