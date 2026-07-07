import { test as base, expect } from '@playwright/test'

// Testy chybových cest schválně vyvolají 4xx odpověď — prohlížeč pak zaloguje network chybu (např. „Failed to load
// resource: ... 409"). Takový test si očekávané chyby povolí anotací:
//   test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
// Bez anotace se chování nemění (jakákoli console/page chyba shodí test).
export const test = base.extend<{ failOnConsole: void }>({
  failOnConsole: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await use()

      const allowed = testInfo.annotations
        .filter((a) => a.type === 'allowConsoleError')
        .map((a) => a.description ?? '')
      const unexpected = errors.filter((e) => !allowed.some((pattern) => e.includes(pattern)))

      expect(unexpected, `Unexpected browser console errors:\n${unexpected.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
export type { Page } from '@playwright/test'
