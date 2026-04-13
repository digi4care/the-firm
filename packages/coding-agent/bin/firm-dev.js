#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const srcCli = join(packageRoot, "src", "cli.ts");
const tsxBin = join(packageRoot, "..", "..", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

if (!existsSync(srcCli)) {
  console.error("firm-dev only works from a source checkout of digi4care/the-firm.");
  process.exit(1);
}

if (!existsSync(tsxBin)) {
  console.error("tsx not found. Run npm install from the repository root first.");
  process.exit(1);
}

const child = spawn(tsxBin, [srcCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PI_CODING_AGENT: "true",
    FIRM_DEV: "1",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
