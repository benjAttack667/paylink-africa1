import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".tmp",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);

const ignoredPathFragments = [
  `${path.sep}tests${path.sep}robot${path.sep}results${path.sep}`,
  `${path.sep}deploy${path.sep}production${path.sep}backups${path.sep}`
];

const ignoredFilePatterns = [
  /\.log$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.webp$/i,
  /\.zip$/i,
  /\.gz$/i,
  /\.ico$/i,
  /\.woff2?$/i,
  /\.ttf$/i,
  /\.pdf$/i,
  /\.xml$/i,
  /package-lock\.json$/i
];

const ignoredFileNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test"
]);

const allowedValueFragments = [
  "change-me",
  "change-this",
  "ci-only",
  "example",
  "placeholder",
  "replace-with",
  "demo",
  "mock",
  "your-",
  "test-only",
  "localhost",
  "password123"
];

const rules = [
  {
    name: "Private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g
  },
  {
    name: "GitHub token",
    regex: /gh[pousr]_[A-Za-z0-9_]{20,}/g
  },
  {
    name: "GitHub fine-grained token",
    regex: /github_pat_[A-Za-z0-9_]{20,}/g
  },
  {
    name: "AWS access key",
    regex: /AKIA[0-9A-Z]{16}/g
  },
  {
    name: "Slack token",
    regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g
  },
  {
    name: "Flutterwave secret key",
    regex: /FLWSECK-[A-Za-z0-9_-]{10,}/g
  },
  {
    name: "JWT secret assignment",
    regex: /(JWT_SECRET\s*[:=]\s*["']?)([^"'\s]{24,})/g,
    valueGroup: 2
  }
];

function shouldIgnorePath(absolutePath) {
  const relativePath = path.relative(repoRoot, absolutePath);
  const fileName = path.basename(absolutePath);

  if (!relativePath || relativePath.startsWith("..")) {
    return true;
  }

  if (ignoredFileNames.has(fileName)) {
    return true;
  }

  if (ignoredFilePatterns.some((pattern) => pattern.test(relativePath))) {
    return true;
  }

  return ignoredPathFragments.some((fragment) => absolutePath.includes(fragment));
}

function isAllowedValue(value) {
  const normalizedValue = String(value).toLowerCase();
  return allowedValueFragments.some((fragment) => normalizedValue.includes(fragment));
}

async function walkDirectory(currentDirectory, files = []) {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || shouldIgnorePath(entryPath)) {
        continue;
      }

      await walkDirectory(entryPath, files);
      continue;
    }

    if (shouldIgnorePath(entryPath)) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function isBinaryContent(content) {
  return content.includes("\u0000");
}

function createExcerpt(line) {
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function collectMatches(relativePath, content) {
  const issues = [];
  const lines = content.split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      const matches = line.matchAll(new RegExp(rule.regex.source, rule.regex.flags));

      for (const match of matches) {
        const matchedValue =
          rule.valueGroup && match[rule.valueGroup] ? match[rule.valueGroup] : match[0];

        if (isAllowedValue(matchedValue)) {
          continue;
        }

        issues.push({
          file: relativePath,
          line: index + 1,
          rule: rule.name,
          excerpt: createExcerpt(line.trim())
        });
      }
    }
  }

  return issues;
}

const files = await walkDirectory(repoRoot);
const findings = [];

for (const filePath of files) {
  const relativePath = path.relative(repoRoot, filePath);
  const content = await fs.readFile(filePath, "utf8");

  if (isBinaryContent(content)) {
    continue;
  }

  findings.push(...collectMatches(relativePath, content));
}

if (findings.length === 0) {
  process.stdout.write("Secret scan passed: no suspicious secrets found.\n");
  process.exit(0);
}

process.stderr.write("Secret scan failed. Suspicious values detected:\n");

for (const finding of findings) {
  process.stderr.write(
    `- ${finding.rule} in ${finding.file}:${finding.line} -> ${finding.excerpt}\n`
  );
}

process.exit(1);
