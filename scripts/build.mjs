/**
 * Builds the Tauri application into platform-specific installers.
 *
 * On Windows, first loads the MSVC compiler environment (link.exe, etc.)
 * via vcvars64.bat, then launches `tauri build` with the enriched PATH.
 * On macOS/Linux, launches `tauri build` directly.
 *
 * Outputs: .msi (Windows), .dmg (macOS), .deb + .AppImage (Linux)
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

  // Launch Tauri build: frontend Vite build → Rust release compile → bundle
  const child = spawn("npx", ["tauri", "build"], {
    stdio: "inherit",
    env,
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});
