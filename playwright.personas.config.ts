import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Persona-based E2E audit proti reálnému API (viz e2e/personas/README.md).
// Očekává běžící backend (5176) + frontend (5173) — stejné prostředí jako playwright.audit.config.ts.
// Přihlašovací údaje POUZE z env / gitignorovaného .env.e2e — nikdy v kódu.
for (const file of ['.env.e2e', '.env']) {
  const p = path.join(import.meta.dirname, file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e/personas',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Reálné API sdílí všechny persony (rate limit 429 při 4 workerech — viz audit) → 2 workery.
  workers: 2,
  timeout: 90_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-personas' }],
    ['json', { outputFile: 'test-results/personas-results.json' }],
  ],
  use: {
    baseURL,
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /personas\.setup\.ts/ },
    {
      name: 'desktop',
      testMatch: /\d\d-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      testMatch: /\d\d-.*\.spec\.ts/,
      // Pixel 7 = chromium → žádný další browser ke stažení; touch + mobilní viewport 412×915.
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
})
