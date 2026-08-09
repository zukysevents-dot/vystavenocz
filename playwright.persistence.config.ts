import { defineConfig, devices } from '@playwright/test'

// E2E suite zaměřená VÝHRADNĚ na ukládání dat proti reálnému API (vystaveno-api).
// Očekává už běžící frontend v API režimu (VITE_API_URL) — stejně jako audit config.
// Přihlašovací údaje POUZE z env: E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD (viz .env.example).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e/persistence',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Souběžné zápisy do jedné demo firmy — nízká paralelizace drží data přehledná.
  workers: 2,
  timeout: 90_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/persistence' }]],
  use: {
    baseURL,
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/persistence/.auth/state.json',
      },
      dependencies: ['setup'],
    },
  ],
})
