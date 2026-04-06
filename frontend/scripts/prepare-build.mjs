import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");
const distDirectory = path.join(
  projectDirectory,
  process.env.NEXT_DIST_DIR?.trim() || ".next"
);
const standaloneDirectory = path.join(distDirectory, "standalone");
const distPackageManifest = path.join(distDirectory, "package.json");

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, {
    recursive: true,
    force: true
  });
}

function removeWithWindowsFallback(targetPath) {
  try {
    removePath(targetPath);
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }

    spawnSync("cmd.exe", ["/d", "/s", "/c", "rmdir", "/s", "/q", targetPath], {
      stdio: "ignore",
      windowsHide: true
    });
  }
}

if (fs.existsSync(distPackageManifest)) {
  const manifestStats = fs.lstatSync(distPackageManifest);

  if (manifestStats.isSymbolicLink()) {
    removeWithWindowsFallback(distDirectory);
  }
}

removeWithWindowsFallback(standaloneDirectory);
