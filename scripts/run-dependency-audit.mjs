import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

function quoteWindowsArgument(argument) {
  if (!argument || /[\s"]/u.test(argument)) {
    return `"${String(argument).replace(/"/g, '\\"')}"`;
  }

  return argument;
}

function spawnCommand(command, args, options = {}) {
  const sharedOptions = {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
    ...options
  };

  if (isWindows) {
    const commandLine = [command, ...args].map(quoteWindowsArgument).join(" ");

    return spawn("cmd.exe", ["/d", "/s", "/c", commandLine], {
      ...sharedOptions,
      shell: false
    });
  }

  return spawn(command, args, {
    ...sharedOptions,
    shell: false
  });
}

async function runCommand(label, command, args) {
  process.stdout.write(`\n==> ${label}\n`);

  await new Promise((resolve, reject) => {
    const child = spawnCommand(command, args);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

await runCommand(
  "Audit backend production dependencies",
  npmCommand,
  ["--prefix", "backend", "audit", "--omit=dev", "--audit-level=high"]
);

await runCommand(
  "Audit frontend production dependencies",
  npmCommand,
  ["--prefix", "frontend", "audit", "--omit=dev", "--audit-level=high"]
);
