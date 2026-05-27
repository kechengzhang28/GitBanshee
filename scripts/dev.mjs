/**
 * Starts Tauri in development mode with hot reload.
 *
 * On Windows, first loads the MSVC compiler environment (link.exe, etc.)
 * via vcvars64.bat, then launches `tauri dev` with the enriched PATH.
 * On macOS/Linux, launches `tauri dev` directly.
 */

import { spawn } from "node:child_process";
import { platform } from "node:os";
import { getVcPath } from "./vcenv.mjs";

async function main() {
  // Resolve MSVC toolchain PATH on Windows
  const vcPath = await getVcPath();

  const env = { ...process.env };
  if (vcPath && platform() === "win32") {
    env.PATH = vcPath;
  }

  // Launch Tauri dev: runs beforeDevCommand (Vite) + Rust compilation + window
  const child = spawn("npx", ["tauri", "dev"], {
    stdio: "inherit",
    env,
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("Failed to start dev environment:", err.message);
  process.exit(1);
});
