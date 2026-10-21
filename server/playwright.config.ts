import { defineConfig } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: 'chromium' },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/status`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ADMIN_PASSWORD: 'e2e-admin',
      SESSION_SECRET: 'e2e-session-secret',
      RING_HMAC_KEY: 'e2e-hmac-key',
      DATA_DIR: 'data/e2e',
      DOORSIGNAL_MODE: 'live',
    },
  },
})
