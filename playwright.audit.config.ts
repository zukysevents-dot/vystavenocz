import { defineConfig, devices } from '@playwright/test'

// E2E audit proti reálnému API režimu (frontend s VITE_API_URL + běžící vystaveno-api).
// Nespouští webServer — očekává už běžící frontend (default http://localhost:5173).
// Přihlašovací údaje POUZE z env: E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD (viz .env.example).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e/audit',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // 1 worker, ne 4: POS suity (08/09) ověřují „vznikl PRÁVĚ JEDEN prodej" proti CELOFIREMNÍMU
  // počtu `GET /sales` a berou nejnovější prodej jako svůj (`items[0]`). Souběžný worker do téže
  // demo firmy prodej přidá — a druhý test pak odstornuje cizí prodej, takže padají náhodně měnící
  // se testy s hláškami typu „odmítnutá platba nesmí založit prodej". Sériově prochází celá suita
  // (ověřeno). Stejný důvod, proč persistence i personas jedou na 2 workerech.
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/audit-report' }]],
  use: {
    baseURL,
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Sdílená session z auth.setup.ts — tokeny žijí jen lokálně, .auth/ je gitignored.
        storageState: 'e2e/audit/.auth/state.json',
      },
      dependencies: ['setup'],
    },
  ],
})
