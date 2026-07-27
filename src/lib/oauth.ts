/**
 * Přihlášení přes poskytovatele identity (Google). Bezpečnostní model je CELÝ na serveru:
 * `state`, `nonce` i PKCE verifier generuje a ukládá backend, `state` je jednorázový, id_token
 * ověřuje server (podpis, issuer, audience, expirace, nonce). Prohlížeč jen přesměruje uživatele
 * a vrátí `code` + `state` — žádné tajemství poskytovatele se do SPA nedostane.
 *
 * Kontrakt: `vystaveno-api/docs/backend/web-identity.md`.
 */

/** Klíč pro krátkodobé předání záměru mezi odchodem k providerovi a návratem na callback. */
const INTENT_KEY = 'vystaveno.oauth.intent.v1'

export type OauthIntent = 'login' | 'register'

export interface OauthStartResponse {
  authorizeUrl: string
  state: string
}

export interface OauthTokens {
  accessToken: string
  refreshToken: string
}

export interface OauthLinkRequired {
  ticket: string
  email: string
}

export interface OauthCallbackResponse {
  tokens: OauthTokens | null
  linkRequired: OauthLinkRequired | null
  returnTo: string | null
}

/**
 * Bezpečná cílová cesta po přihlášení. Povolena je jen relativní cesta v rámci aplikace —
 * `//cizi.web`, absolutní URL ani `javascript:` se nesmí stát cílem přesměrování.
 * (Server dělá totéž pro `returnTo`; klient nesmí být slabší článek.)
 */
export function safeRedirect(target: string | null | undefined, fallback = '/app'): string {
  if (!target) return fallback
  if (!target.startsWith('/') || target.startsWith('//')) return fallback
  return target
}

/** Záměr uživatele (přihlášení vs. registrace) přežije redirect k providerovi — jen kvůli textům. */
export function rememberIntent(intent: OauthIntent): void {
  try {
    sessionStorage.setItem(INTENT_KEY, intent)
  } catch {
    /* privátní režim bez sessionStorage — texty pak budou obecné, flow běží dál */
  }
}

export function consumeIntent(): OauthIntent {
  try {
    const stored = sessionStorage.getItem(INTENT_KEY)
    sessionStorage.removeItem(INTENT_KEY)
    return stored === 'register' ? 'register' : 'login'
  } catch {
    return 'login'
  }
}

/**
 * Odstraní `code`/`state` z adresního řádku hned po zpracování. Autorizační kód je jednorázový,
 * ale nemá co zůstat v historii prohlížeče, v `Referer` hlavičce ani ve sdíleném odkazu.
 */
export function scrubCallbackUrl(): void {
  const clean = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState(window.history.state, '', clean)
}

/** Zrušení uživatelem vs. skutečná chyba providera — každé si zaslouží jinou hlášku. */
export function isUserCancelled(providerError: string | null): boolean {
  return providerError === 'access_denied' || providerError === 'user_cancelled_authorize'
}
