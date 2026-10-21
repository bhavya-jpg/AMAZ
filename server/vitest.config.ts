import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: { DATA_DIR: 'data/unit', DB_FILE: ':memory:', RING_HMAC_KEY: 'test-hmac-key', ADMIN_PASSWORD: 'test-admin', SESSION_SECRET: 'test-session' },
    // node:sqlite singleton lives on globalThis; run files in separate workers.
    pool: 'forks',
  },
})
