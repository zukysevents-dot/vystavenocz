import { defineConfig, devices } from '@playwright/test'

// Vyhrazený port pro e2e, ať nekoliduje s běžným dev serverem (5173/5174).
const PORT = 5180
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // e2e/audit má vlastní config (playwright.audit.config.ts) a běží proti reálnému API,
  // ne proti mock webServeru — do výchozího běhu nepatří.
  testIgnore: '**/audit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
