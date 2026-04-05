import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const backendPort = "4000";
const healthUrl = `http://127.0.0.1:${backendPort}/api/health`;

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

function quoteWindowsArgument(argument) {
  if (!argument || /[\s"]/u.test(argument)) {
    return `"${String(argument).replace(/"/g, '\\"')}"`;
  }

  return argument;
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, options);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function waitForHealthcheck(url, timeoutMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Backend not ready yet.
    }

    await delay(1000);
  }

  throw new Error(`Backend healthcheck did not become ready at ${url}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const finish = () => resolve();
    child.once("exit", finish);

    if (isWindows) {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore"
      });

      killer.once("exit", finish);
      killer.once("error", finish);
      return;
    }

    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 5000).unref();
  });
}

let backendProcess;

try {
  if (process.env.SKIP_DB_UP !== "true") {
    await runCommand(npmCommand, ["run", "db:up"]);
  }

  await runCommand(npmCommand, ["run", "prisma:deploy"]);

  backendProcess = spawnCommand(npmCommand, ["run", "start:backend"], {
    env: {
      ...process.env,
      PORT: backendPort
    }
  });

  await waitForHealthcheck(healthUrl);
  await runCommand("python", ["-m", "robot", "-d", "tests/robot/results", "tests/robot/suites"]);
} finally {
  await stopProcess(backendProcess);
}
