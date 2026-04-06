import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const isWindows = process.platform === "win32";
const maxAttempts = 8;

function spawnGenerate() {
  if (isWindows) {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npx prisma generate"], {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env
      },
      shell: false
    });
  }

  return spawn("npx", ["prisma", "generate"], {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env
    },
    shell: false
  });
}

async function runGenerate(attempt) {
  await new Promise((resolve, reject) => {
    const child = spawnGenerate();

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prisma generate failed with exit code ${code}`));
    });
  });

  if (attempt > 1) {
    process.stdout.write(`Prisma generate succeeded on attempt ${attempt}.\n`);
  }
}

let lastError = null;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await runGenerate(attempt);
    process.exit(0);
  } catch (error) {
    lastError = error;

    if (attempt === maxAttempts) {
      break;
    }

    const waitMs = Math.min(8000, 1500 * attempt);
    process.stdout.write(
      `Prisma generate retry ${attempt}/${maxAttempts - 1} after transient failure. Waiting ${waitMs}ms.\n`
    );
    await delay(waitMs);
  }
}

throw lastError;
