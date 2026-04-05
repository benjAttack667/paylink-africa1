import { copyFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const stackDir = path.join(rootDir, "deploy", "production");
const envExamplePath = path.join(stackDir, ".env.example");
const envPath = path.join(stackDir, ".env");
const composePath = path.join(stackDir, "docker-compose.yml");

const createdTempEnv = !existsSync(envPath);

if (createdTempEnv) {
  copyFileSync(envExamplePath, envPath);
}

try {
  execFileSync(
    "docker",
    [
      "compose",
      "--env-file",
      envExamplePath,
      "-f",
      composePath,
      "config"
    ],
    {
      stdio: "inherit",
      cwd: rootDir
    }
  );
} finally {
  if (createdTempEnv && existsSync(envPath)) {
    rmSync(envPath);
  }
}
