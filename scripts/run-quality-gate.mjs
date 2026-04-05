import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const steps = [
  { label: "Secret scan", args: ["run", "security:secrets"] },
  { label: "Dependency audit", args: ["run", "security:audit"] },
  { label: "Prisma generate", args: ["run", "prisma:generate"] },
  { label: "Prisma validate", args: ["run", "prisma:validate"] },
  { label: "Frontend build", args: ["run", "build:frontend"] },
  { label: "Robot API tests", args: ["run", "test:robot:api"] },
  { label: "Playwright E2E tests", args: ["run", "test:e2e"] }
];

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

async function runStep(step) {
  process.stdout.write(`\n==> ${step.label}\n`);

  await new Promise((resolve, reject) => {
    const child = spawnCommand(npmCommand, step.args, {
      env: {
        ...process.env
      }
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.label} failed with exit code ${code}`));
    });
  });
}

for (const step of steps) {
  await runStep(step);
}

process.stdout.write("\nQuality gate passed.\n");
