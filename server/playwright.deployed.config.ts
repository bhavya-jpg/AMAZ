// End-to-end tests against a running deployment (Render, or the Docker image in CI). No webServer:
//   DEPLOYED_URL=https://amaz-1r9h.onrender.com DEPLOYED_ADMIN_PASSWORD=... npm run test:deployed
// The admin password is read from the environment only. Traces are off because they would record
// request bodies; screenshots and error logs are attached to the report instead.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/deployed',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  outputDir: 'test-results/deployed',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/deployed', open: 'never' }]],
  use: {
    baseURL: process.env.DEPLOYED_URL ?? 'https://amaz-1r9h.onrender.com',
    browserName: 'chromium',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'off',
  },
})
