#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs";
import { spawnSync } from "child_process";
import { glob } from "glob";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const AMBER = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";

const IS_WINDOWS = process.platform === "win32";

function printError(msg: string): void {
  console.error(`\n${RED}${BOLD}Phasio error:${RESET} ${msg}\n`);
}

function resolveTsNode(): string | null {
  const candidates = [
    path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      IS_WINDOWS ? "ts-node.cmd" : "ts-node",
    ),
    "ts-node",
  ];
  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ["--version"], {
        encoding: "utf8",
        shell: IS_WINDOWS,
      });
      if (result.status === 0) return candidate;
    } catch {
      // not found, try next
    }
  }
  return null;
}

function resolveConfigFile(): string | null {
  const candidates = [
    path.join(process.cwd(), "phasio.config.ts"),
    path.join(process.cwd(), "phasio.config.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function readPhasioPackageConfig(): { testDir?: string } {
  const pkgPath = path.join(process.cwd(), "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      phasio?: { testDir?: string };
    };
    return pkg.phasio ?? {};
  } catch {
    return {};
  }
}

function parseArgs(argv: string[]): { files: string[]; dir: string | null } {
  const args = argv.slice(2);
  const files: string[] = [];
  let dir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) {
      dir = args[++i];
    } else if (!args[i].startsWith("--")) {
      files.push(args[i]);
    }
  }

  return { files, dir };
}

async function resolveFiles(
  explicitFiles: string[],
  dir: string | null,
  configDir: string | undefined,
): Promise<string[]> {
  if (explicitFiles.length > 0) {
    const resolved = explicitFiles.map((f) => path.resolve(process.cwd(), f));
    for (const f of resolved) {
      if (!fs.existsSync(f)) {
        printError(`File not found: ${f}`);
        process.exit(1);
      }
    }
    return resolved;
  }

  const testDir = dir ?? configDir ?? "phasio";
  const testDirAbs = path.resolve(process.cwd(), testDir);

  if (!fs.existsSync(testDirAbs)) {
    printError(
      `Test directory not found: ${testDir}\n\n` +
        `  Create a ${BOLD}${testDir}/${RESET} folder with your test files, or specify a directory:\n` +
        `  ${DIM}npx phasio --dir path/to/tests${RESET}\n`,
    );
    process.exit(1);
  }

  const pattern = path.join(testDirAbs, "**", "*.test.ts").replace(/\\/g, "/");
  const files = await glob(pattern);

  if (files.length === 0) {
    printError(
      `No *.test.ts files found in: ${testDir}\n\n` +
        `  Make sure your test files end with ${BOLD}.test.ts${RESET}\n`,
    );
    process.exit(1);
  }

  return files.map((f) => path.resolve(f));
}

function buildRunnerScript(configFile: string, testFile: string): string {
  const configPath = configFile.replace(/\\/g, "\\\\");
  const testPath = testFile.replace(/\\/g, "\\\\");
  const cwd = process.cwd().replace(/\\/g, "\\\\");

  // All requires resolved from the project root — temp dir has no node_modules
  const lines = [
    // dotenv — optional
    "try {",
    "  var dotenvPath = require.resolve('dotenv', { paths: ['" + cwd + "'] });",
    "  require(dotenvPath).config({ path: require('path').join('" +
      cwd +
      "', '.env') });",
    "} catch (e) { /* dotenv not installed — skip */ }",
    // resolve SDK paths from project root
    "var sdkConfigPath = require.resolve('@phasio/sdk/dist/config', { paths: ['" +
      cwd +
      "'] });",
    "var sdkIndexPath = require.resolve('@phasio/sdk', { paths: ['" +
      cwd +
      "'] });",
    "var config = require('" + configPath + "');",
    "var cfg = config.default != null ? config.default : config;",
    "var sdkConfig = require(sdkConfigPath);",
    "var sdkClient = require(sdkIndexPath);",
    "sdkConfig.setGlobalConfig(cfg);",
    "require('" + testPath + "');",
    "setImmediate(async function() {",
    "  await sdkClient.pe.run();",
    "});",
  ];

  return lines.join("\n");
}

async function main(): Promise<void> {
  const { files: explicitFiles, dir } = parseArgs(process.argv);
  const pkgConfig = readPhasioPackageConfig();

  const tsNode = resolveTsNode();
  if (!tsNode) {
    printError(
      `ts-node not found. Phasio requires ts-node to run TypeScript test files.\n\n` +
        `  Install it in your project:\n` +
        `  ${DIM}npm install -D ts-node typescript${RESET}\n`,
    );
    process.exit(1);
  }

  const configFile = resolveConfigFile();
  if (!configFile) {
    printError(
      "phasio.config.ts not found at project root.\n\n" +
        "  Create one:\n\n" +
        "  // phasio.config.ts\n" +
        "  import { defineConfig } from '@phasio/sdk';\n" +
        "  export default defineConfig({\n" +
        "    apiKey: process.env.PHASIO_API_KEY,\n" +
        "    providers: [{ provider: 'openai', llmKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }],\n" +
        "    versions: [{ label: 'v1', template: 'Answer briefly: {{input}}' }],\n" +
        "  });\n",
    );
    process.exit(1);
  }

  const testFiles = await resolveFiles(explicitFiles, dir, pkgConfig.testDir);

  const { version } = require("../package.json") as { version: string };
  console.log(`\n${BOLD}Phasio${RESET} ${DIM}v${version}${RESET}`);
  console.log(
    `${DIM}Running ${testFiles.length} test file${testFiles.length !== 1 ? "s" : ""}...${RESET}\n`,
  );

  let anyFailed = false;

  for (const file of testFiles) {
    const relative = path.relative(process.cwd(), file);
    console.log(`${AMBER}▶${RESET} ${relative}`);

    const runnerScript = buildRunnerScript(configFile, file);
    const tmpFile = path.join(
      require("os").tmpdir() as string,
      `phasio-runner-${Date.now()}.js`,
    );
    fs.writeFileSync(tmpFile, runnerScript);

    const result = spawnSync("node", [tmpFile], {
      stdio: "inherit",
      encoding: "utf8",
      shell: IS_WINDOWS,
      env: { ...process.env },
      cwd: process.cwd(),
    });

    fs.unlinkSync(tmpFile);

    if (result.status !== 0) anyFailed = true;
    if (result.error) {
      printError(`Failed to run ${relative}: ${result.error.message}`);
      anyFailed = true;
    }
  }

  console.log("\n" + "═".repeat(64));
  if (anyFailed) {
    console.log(`${RED}${BOLD}✗ Some test files failed${RESET}`);
    console.log("═".repeat(64) + "\n");
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}✓ All test files passed${RESET}`);
    console.log("═".repeat(64) + "\n");
    process.exit(0);
  }
}

main().catch((err: Error) => {
  printError(err.message);
  process.exit(1);
});
