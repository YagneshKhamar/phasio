import type { PhasioConfig, ProviderConfig, PromptVersion, TelemetryConfig } from './types';

// Global config store — set once by defineConfig(), read by pe singleton at run() time
let globalConfig: PhasioConfig | null = null;

/**
 * Define Phasio configuration. Call this in phasio.config.ts and export as default.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   projectKey: process.env.PHASIO_PROJECT_KEY,
 *   providers: [{ provider: 'openai', llmKey: process.env.OPENAI_KEY, model: 'gpt-4o-mini' }],
 *   versions: [{ label: 'v1', template: 'Answer: {{input}}' }],
 * })
 * ```
 */
export function defineConfig(config: PhasioConfig): PhasioConfig {
  globalConfig = config;
  return config;
}

export function getGlobalConfig(): PhasioConfig {
  if (!globalConfig) {
    throw new Error(
      'Phasio config not found.\n\n' +
      '  Create a phasio.config.ts at your project root:\n\n' +
      '  import { defineConfig } from \'@phasio/sdk\';\n' +
      '  export default defineConfig({\n' +
      '    projectKey: process.env.PHASIO_PROJECT_KEY,\n' +
      '    providers: [{ provider: \'openai\', llmKey: process.env.OPENAI_KEY, model: \'gpt-4o-mini\' }],\n' +
      '    versions: [{ label: \'v1\', template: \'Answer: {{input}}\' }],\n' +
      '  });\n',
    );
  }
  return globalConfig;
}

export function setGlobalConfig(config: PhasioConfig): void {
  globalConfig = config;
}

/** Resolve effective API key — projectKey takes precedence over legacy apiKey */
export function resolveApiKey(config: PhasioConfig): string {
  const key = config.projectKey ?? config.apiKey;
  if (!key) {
    throw new Error(
      'Phasio requires a projectKey.\n\n' +
      '  defineConfig({ projectKey: process.env.PHASIO_PROJECT_KEY, ... })\n',
    );
  }
  return key;
}

export function resolveProviders(config: PhasioConfig): ProviderConfig[] {
  return Array.isArray(config.providers) ? config.providers : [config.providers];
}

export function resolveJudgeProviders(config: PhasioConfig): ProviderConfig[] {
  const raw = config.judgeProviders ?? config.providers;
  return Array.isArray(raw) ? raw : [raw];
}

export function resolveVersions(config: PhasioConfig): PromptVersion[] {
  return config.versions ?? [];
}

export function resolveTelemetryConfig(config: PhasioConfig): TelemetryConfig {
  if (!config.telemetry) return { enabled: false, sendInputs: false };
  if (config.telemetry === true) return { enabled: true, sendInputs: false };
  return {
    enabled: config.telemetry.enabled,
    sendInputs: config.telemetry.sendInputs ?? false,
  };
}
