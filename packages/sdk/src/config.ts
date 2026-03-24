import type { PhasioConfig, ProviderConfig, PromptVersion } from "./types";

// Global config store — set once by defineConfig(), read by pe singleton
let globalConfig: PhasioConfig | null = null;

export function defineConfig(config: PhasioConfig): PhasioConfig {
  globalConfig = config;
  return config;
}

export function getGlobalConfig(): PhasioConfig {
  if (!globalConfig) {
    throw new Error(
      "Phasio config not found.\n\n" +
        "  Create a phasio.config.ts at your project root:\n\n" +
        "  import { defineConfig } from '@phasio/sdk';\n" +
        "  export default defineConfig({ apiKey: '...', providers: [...], versions: [...] });\n",
    );
  }
  return globalConfig;
}

export function setGlobalConfig(config: PhasioConfig): void {
  globalConfig = config;
}

export function resolveProviders(config: PhasioConfig): ProviderConfig[] {
  return Array.isArray(config.providers)
    ? config.providers
    : [config.providers];
}

export function resolveJudgeProviders(config: PhasioConfig): ProviderConfig[] {
  const raw = config.judgeProviders ?? config.providers;
  return Array.isArray(raw) ? raw : [raw];
}

export function resolveVersions(config: PhasioConfig): PromptVersion[] {
  return config.versions ?? [];
}
