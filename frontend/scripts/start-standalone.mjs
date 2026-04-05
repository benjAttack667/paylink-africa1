import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");
const buildDirectory = path.join(projectDirectory, ".next");
const standaloneRoot = path.join(buildDirectory, "standalone");
const standaloneAppDirectory = path.join(standaloneRoot, "frontend");
const standaloneStaticDirectory = path.join(standaloneAppDirectory, ".next", "static");
const sourceStaticDirectory = path.join(buildDirectory, "static");
const sourcePublicDirectory = path.join(projectDirectory, "public");
const standalonePublicDirectory = path.join(standaloneAppDirectory, "public");
const standaloneServerFile = path.join(standaloneAppDirectory, "server.js");

function copyDirectoryIfPresent(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    force: true
  });
}

if (!fs.existsSync(standaloneServerFile)) {
  console.error(
    "Build standalone introuvable. Lancez d'abord `npm run build` dans le frontend."
  );
  process.exit(1);
}

copyDirectoryIfPresent(sourceStaticDirectory, standaloneStaticDirectory);
copyDirectoryIfPresent(sourcePublicDirectory, standalonePublicDirectory);

const serverProcess = spawn(process.execPath, [standaloneServerFile], {
  cwd: standaloneAppDirectory,
  stdio: "inherit",
  env: {
    ...process.env
  }
});

serverProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

