import { spawn } from "node:child_process";
import { platform } from "node:os";
import { existsSync } from "node:fs";

/**
 * Extracts the MSVC-augmented PATH from vcvars64.bat on Windows.
 *
 * Works by spawning PowerShell to run vcvars64.bat in-process,
 * then capturing `$env:PATH` afterward (which includes the MSVC toolchain).
 *
 * On non-Windows, returns the current PATH unchanged.
 */
export async function getVcPath() {
  if (platform() !== "win32") {
    return process.env.PATH;
  }

  const programFiles = process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
  const vcvars = `${programFiles}\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat`;

  if (!existsSync(vcvars)) {
    throw new Error(
      `VS Build Tools not found at "${vcvars}".\n` +
        "Install from https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022\n" +
        "with the 'Desktop development with C++' workload.",
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", `try { & '${vcvars}' *> $null } catch {}; $env:PATH`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`vcvars failed with exit code ${code}`));
      }
      resolve(output.trim());
    });

    child.on("error", reject);
  });
}
