import { defineConfig, devices } from "@playwright/test";

const testFrontendUrl = "http://localhost:3100";
const testBackendUrl = "http://localhost:4100";

function createBackendCommand() {
  if (process.platform === "win32") {
    return `powershell -NoProfile -Command "$env:PORT='4100'; $env:CLIENT_URL='${testFrontendUrl}'; $env:ALLOWED_ORIGINS='${testFrontendUrl}'; $env:API_PUBLIC_URL='${testBackendUrl}'; npm --prefix backend start"`;
  }

  return `PORT=4100 CLIENT_URL=${testFrontendUrl} ALLOWED_ORIGINS=${testFrontendUrl} API_PUBLIC_URL=${testBackendUrl} npm --prefix backend start`;
}

function createFrontendCommand() {
  if (process.platform === "win32") {
    return `powershell -NoProfile -Command "$env:NEXT_DIST_DIR='.next-e2e'; $env:NEXT_PUBLIC_API_BASE_URL='${testBackendUrl}/api'; npm --prefix frontend run dev -- --hostname 127.0.0.1 --port 3100"`;
  }

  return `NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_API_BASE_URL=${testBackendUrl}/api npm --prefix frontend run dev -- --hostname 127.0.0.1 --port 3100`;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: {
    timeout: 10000
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: testFrontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ],
  webServer: [
    {
      command: createBackendCommand(),
      url: `${testBackendUrl}/api/health/ready`,
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: createFrontendCommand(),
      url: testFrontendUrl,
      reuseExistingServer: false,
      timeout: 120000
    }
  ]
});
