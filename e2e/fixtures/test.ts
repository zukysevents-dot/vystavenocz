import { test as base, expect } from '@playwright/test'

export const test = base.extend<{ failOnConsole: void }>({
  failOnConsole: [
    async ({ page }, use) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await use()

      expect(errors, `Unexpected browser console errors:\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
export type { Page } from '@playwright/test'
