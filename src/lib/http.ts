/**
 * HTTP klient pro reálné API (vystaveno-api).
 *
 * Aktivní jen když je nastavené `VITE_API_URL` (např. http://localhost:5080/api/v1).
 * Když prázdné → appka běží v mock režimu (localStorage) a tento modul se nevolá.
 *
 * Řeší: ukládání JWT (access + refresh), hlavičku Authorization: Bearer,
 * a transparentní obnovu access tokenu při 401 (refresh + jednorázové zopakování requestu).
 */

const API_URL = import.meta.env.VITE_API_URL as string | undefined
const TOKENS_KEY = 'vystaveno.auth.tokens.v1'

export interface Tokens {
  accessToken: string
  refreshToken: string
}

/** True = napojeno na reálné API; false = mock localStorage režim. */
export function isApiMode(): boolean {
  return Boolean(API_URL)
}

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

export function setTokens(tokens: Tokens | null): void {
  if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
  else localStorage.removeItem(TOKENS_KEY)
}

/** Chyba z API — nese HTTP status a (volitelně) ProblemDetails tělo. */
export class ApiError extends Error {
  readonly status: number
  readonly detail?: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

// Souběžné requesty po expiraci tokenu sdílí jeden refresh — backend rotuje refresh token,
// dva paralelní refreshe by se navzájem zneplatnily.
let refreshing: Promise<Tokens | null> | null = null

function refreshTokens(): Promise<Tokens | null> {
  const current = getTokens()
  if (!current?.refreshToken) return Promise.resolve(null)
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      if (!res.ok) {
        setTokens(null)
        return null
      }
      const tokens = (await res.json()) as Tokens
      setTokens(tokens)
      return tokens
    } catch {
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const tokens = getTokens()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Access token expiroval → zkus refresh a request jednou zopakuj.
  if (res.status === 401 && retry && getTokens()?.refreshToken) {
    const refreshed = await refreshTokens()
    if (refreshed) return request<T>(method, path, body, false)
  }

  if (!res.ok) {
    let detail: unknown
    try {
      detail = await res.json()
    } catch {
      /* prázdné / nečitelné tělo */
    }
    const problem = detail as { detail?: string; title?: string } | undefined
    throw new ApiError(
      res.status,
      problem?.detail ?? problem?.title ?? `HTTP ${res.status}`,
      detail,
    )
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}
