export type CookieConsent = {
  necessary: true
  analytics: boolean
  decidedAt: string
}

const STORAGE_KEY = 'vystaveno.cookieConsent.v1'
export const CONSENT_EVENT = 'vystaveno:cookie-consent'
export const CONSENT_RESET_EVENT = 'vystaveno:cookie-consent-reset'

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CookieConsent) : null
  } catch {
    return null
  }
}

export function saveCookieConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }))
  return consent
}

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(CONSENT_RESET_EVENT))
}
