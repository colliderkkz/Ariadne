import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const python =
  process.env.E2E_PYTHON ??
  (process.platform === "win32"
    ? "backend/.venv/Scripts/python.exe"
    : "backend/.venv/bin/python");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.platform === "win32" ? "msedge" : undefined,
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `"${resolve(python)}" "${resolve("backend/scripts/e2e_server.py")}"`,
      url: "http://127.0.0.1:8001/health/ready",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command:
        "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8001",
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
