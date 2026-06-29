import type { Page } from '@playwright/test'

/** Odbav cookie banner (jinak překrývá navigační tlačítka dole na stránce). */
export async function dismissCookies(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'vystaveno.cookieConsent.v1',
        JSON.stringify({
          necessary: true,
          analytics: false,
          decidedAt: '2026-01-01T00:00:00.000Z',
        }),
      )
    } catch {
      /* localStorage nedostupný — banner zůstane, ale test to zachytí */
    }
  })
}
