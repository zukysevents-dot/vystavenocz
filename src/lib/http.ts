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

declare global {
  interface Window {
    __VYSTAVENO_API_URL__?: string
  }
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

/** True = napojeno na reálné API; false = mock localStorage režim. */
export function isApiMode(): boolean {
  return Boolean(apiUrl())
}

function apiUrl(): string | undefined {
  return API_URL || (typeof window !== 'undefined' ? window.__VYSTAVENO_API_URL__ : undefined)
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

export interface DownloadResponse {
  blob: Blob
  fileName: string | null
  contentType: string | null
}

export interface UploadOptions {
  onProgress?: (percent: number) => void
}

// Souběžné requesty po expiraci tokenu sdílí jeden refresh — backend rotuje refresh token,
// dva paralelní refreshe by se navzájem zneplatnily.
let refreshing: Promise<Tokens | null> | null = null

function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vystaveno:unauthorized'))
}

function refreshTokens(): Promise<Tokens | null> {
  const current = getTokens()
  if (!current?.refreshToken) return Promise.resolve(null)
  const baseUrl = apiUrl()
  if (!baseUrl) return Promise.resolve(null)
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
  isPublic = false,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const baseUrl = apiUrl()
  if (!baseUrl) throw new ApiError(0, 'API URL není nastavené.')
  // Veřejná volání (klientský portál, rezervace) MUSÍ jít bez Authorization —
  // jinak by se na public endpoint přiložil JWT náhodně přihlášeného operátora.
  const tokens = isPublic ? null : getTokens()
  const shouldNotifyUnauthorized = !isPublic && Boolean(tokens?.accessToken || tokens?.refreshToken)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`
  Object.assign(headers, extraHeaders)

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Access token expiroval → zkus refresh a request jednou zopakuj (jen u auth volání).
  if (!isPublic && res.status === 401 && retry && getTokens()?.refreshToken) {
    const refreshed = await refreshTokens()
    if (refreshed) return request<T>(method, path, body, false, isPublic, extraHeaders)
  }

  if (!res.ok) {
    if (res.status === 401 && shouldNotifyUnauthorized) notifyUnauthorized()
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

async function download(path: string, retry = true): Promise<DownloadResponse> {
  const baseUrl = apiUrl()
  if (!baseUrl) throw new ApiError(0, 'API URL není nastavené.')
  const tokens = getTokens()
  const shouldNotifyUnauthorized = Boolean(tokens?.accessToken || tokens?.refreshToken)
  const headers: Record<string, string> = { Accept: '*/*' }
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`

  const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers })

  if (res.status === 401 && retry && getTokens()?.refreshToken) {
    const refreshed = await refreshTokens()
    if (refreshed) return download(path, false)
  }

  if (!res.ok) {
    if (res.status === 401 && shouldNotifyUnauthorized) notifyUnauthorized()
    let detail: unknown
    try {
      detail = await res.json()
    } catch {
      try {
        detail = await res.text()
      } catch {
        /* prázdné / nečitelné tělo */
      }
    }
    const problem = detail as { detail?: string; title?: string } | undefined
    throw new ApiError(
      res.status,
      problem?.detail ?? problem?.title ?? `HTTP ${res.status}`,
      detail,
    )
  }

  return {
    blob: await res.blob(),
    fileName: parseContentDispositionFileName(res.headers.get('content-disposition')),
    contentType: res.headers.get('content-type'),
  }
}

async function uploadRequest<T>(
  path: string,
  formData: FormData,
  reportProgress: (percent: number, complete?: boolean) => void,
  retry = true,
): Promise<T> {
  const baseUrl = apiUrl()
  if (!baseUrl) throw new ApiError(0, 'API URL není nastavené.')
  const tokens = getTokens()
  const shouldNotifyUnauthorized = Boolean(tokens?.accessToken || tokens?.refreshToken)

  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}${path}`)
    xhr.setRequestHeader('Accept', 'application/json')
    if (tokens?.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        reportProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () =>
      resolve({
        status: xhr.status,
        body: xhr.responseText,
      })
    xhr.onerror = () => reject(new ApiError(0, 'Spojení se serverem selhalo.'))
    xhr.onabort = () => reject(new ApiError(0, 'Nahrávání bylo přerušeno.'))
    xhr.send(formData)
  })

  if (response.status === 401 && retry && getTokens()?.refreshToken) {
    const refreshed = await refreshTokens()
    if (refreshed) return uploadRequest<T>(path, formData, reportProgress, false)
  }

  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401 && shouldNotifyUnauthorized) notifyUnauthorized()
    let detail: unknown
    if (response.body) {
      try {
        detail = JSON.parse(response.body)
      } catch {
        detail = response.body
      }
    }
    const problem = detail as { detail?: string; title?: string } | undefined
    throw new ApiError(
      response.status,
      problem?.detail ?? problem?.title ?? `HTTP ${response.status}`,
      detail,
    )
  }

  const result =
    response.status === 204 || !response.body ? (undefined as T) : (JSON.parse(response.body) as T)
  reportProgress(100, true)
  return result
}

async function upload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {},
): Promise<T> {
  let lastProgress = -1
  const reportProgress = (percent: number, complete = false) => {
    // XHR může při retry začít znovu od nuly. UI nesmí couvnout a 100 % patří až úspěšné odpovědi.
    const next = complete ? 100 : Math.min(99, Math.max(0, percent))
    if (next <= lastProgress) return
    lastProgress = next
    options.onProgress?.(next)
  }
  return uploadRequest<T>(path, formData, reportProgress)
}

function parseContentDispositionFileName(value: string | null): string | null {
  if (!value) return null
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1] ?? null
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  postWithHeaders: <T>(path: string, body: unknown, headers: Record<string, string>) =>
    request<T>('POST', path, body, true, false, headers),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
  download,
  upload,
  // Neautorizované volání (bez Authorization a bez refresh/retry) — veřejné endpointy.
  getPublic: <T>(path: string) => request<T>('GET', path, undefined, false, true),
  postPublic: <T>(path: string, body?: unknown) => request<T>('POST', path, body, false, true),
  // URL pro veřejný odkaz (např. PDF klientského portálu) — nikdy nepřidává Authorization.
  publicUrl: (path: string) => `${apiUrl() ?? ''}${path}`,
}
