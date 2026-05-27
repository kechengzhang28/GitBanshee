import { spawn, execFile } from "node:child_process";
import { platform } from "node:os";

async function getVcEnvPath() {
  if (platform() !== "win32") return process.env.PATH;

  const programFiles = process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
  const vcvars = `${programFiles}\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat`;

  return new Promise((resolve, reject) => {
    execFile(
      "cmd.exe",
      ["/c", `"${vcvars}" > nul 2>&1 && echo %PATH%`],
      { encoding: "utf8" },
      (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout.trim());
      },
    );
  });
}

async function main() {
  const vcPath = await getVcEnvPath();
  const env = { ...process.env };
  if (vcPath && platform() === "win32") {
    env.PATH = vcPath;
  }

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
