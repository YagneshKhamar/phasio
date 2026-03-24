import type { SuiteDefinition, HookFn } from "../types";

// Global suite registry
const suiteRegistry: SuiteDefinition[] = [];
let onlyMode = false;

// Current suite hooks — collected while describe() callback runs
let currentHooks: SuiteDefinition["hooks"] = {
  beforeAll: [],
  beforeEach: [],
  afterAll: [],
  afterEach: [],
};

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
}

export function setOnlyMode(): void {
  onlyMode = true;
}

export function isOnlyMode(): boolean {
  return onlyMode;
}

// Hook registration — called inside describe() callback
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

// Called by _registerSuite before running the callback
export function resetCurrentHooks(): void {
  currentHooks = {
    beforeAll: [],
    beforeEach: [],
    afterAll: [],
    afterEach: [],
  };
}

// Called by _registerSuite after running the callback to capture hooks
export function consumeCurrentHooks(): SuiteDefinition["hooks"] {
  const hooks = { ...currentHooks };
  resetCurrentHooks();
  return hooks;
}
