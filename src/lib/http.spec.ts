import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, http, saveErrorMessage, setTokens } from '@/lib/http'

// Ověřuje, že veřejná volání (klientský portál / rezervace) NEposílají Authorization,
// i když je operátor přihlášený — jinak by JWT unikl na neautorizovaný public endpoint.
describe('http — veřejná varianta bez auth', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    setTokens({ accessToken: 'ACCESS', refreshToken: 'REFRESH' })
    fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    setTokens(null)
    delete window.__VYSTAVENO_API_URL__
    vi.unstubAllGlobals()
  })

  function headersOf(call: number): Record<string, string> {
    return fetchMock.mock.calls[call][1].headers as Record<string, string>
  }

  it('getPublic neposílá Authorization ani při přihlášeném uživateli', async () => {
    await http.getPublic('/public/client/tok')
    expect(headersOf(0).Authorization).toBeUndefined()
  })

  it('postPublic neposílá Authorization', async () => {
    await http.postPublic('/public/client/tok/quotes/1/approve')
    expect(headersOf(0).Authorization).toBeUndefined()
  })

  it('běžný http.get Authorization posílá (regresní kontrola)', async () => {
    await http.get('/invoices')
    expect(headersOf(0).Authorization).toBe('Bearer ACCESS')
  })

  it('po definitivním 401 oznámí aplikaci neplatnou relaci', async () => {
    const unauthorized = vi.fn()
    window.addEventListener('vystaveno:unauthorized', unauthorized)
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })

    await expect(http.get('/invoices')).rejects.toMatchObject({ status: 401 })

    expect(unauthorized).toHaveBeenCalledTimes(1)
    window.removeEventListener('vystaveno:unauthorized', unauthorized)
  })
})

describe('http.upload', () => {
  class MockXhr {
    static instances: MockXhr[] = []
    upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    onabort: (() => void) | null = null
    status = 201
    responseText = JSON.stringify({ id: 'file-1' })
    headers: Record<string, string> = {}
    body: FormData | null = null

    constructor() {
      MockXhr.instances.push(this)
    }
    open() {}
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value
    }
    getResponseHeader() {
      return 'application/json'
    }
    send(body: FormData) {
      this.body = body
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 } as ProgressEvent)
      this.onload?.()
    }
  }

  beforeEach(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    setTokens({ accessToken: 'ACCESS', refreshToken: 'REFRESH' })
    MockXhr.instances = []
    vi.stubGlobal('XMLHttpRequest', MockXhr)
  })

  afterEach(() => {
    setTokens(null)
    delete window.__VYSTAVENO_API_URL__
    vi.unstubAllGlobals()
  })

  it('pošle FormData s autorizací, průběhem a bez ručního Content-Type', async () => {
    const formData = new FormData()
    formData.append('file', new File(['data'], 'doklad.pdf', { type: 'application/pdf' }))
    const progress = vi.fn()

    await expect(
      http.upload('/jobs/job-1/files', formData, { onProgress: progress }),
    ).resolves.toEqual({
      id: 'file-1',
    })

    const xhr = MockXhr.instances[0]
    expect(xhr.body).toBe(formData)
    expect(xhr.headers.Authorization).toBe('Bearer ACCESS')
    expect(xhr.headers['Content-Type']).toBeUndefined()
    expect(progress).toHaveBeenCalledWith(50)
    expect(progress).toHaveBeenLastCalledWith(100)
  })

  it('po 401 obnoví token a upload jednou zopakuje', async () => {
    const originalSend = MockXhr.prototype.send
    const progress = vi.fn()
    MockXhr.prototype.send = function (body: FormData) {
      this.body = body
      if (MockXhr.instances.length === 1) {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 10 } as ProgressEvent)
        this.status = 401
        this.responseText = ''
      } else {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 10 } as ProgressEvent)
      }
      this.onload?.()
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ accessToken: 'NEW_ACCESS', refreshToken: 'NEW_REFRESH' }),
      })),
    )

    await http.upload('/jobs/job-1/files', new FormData(), { onProgress: progress })

    expect(MockXhr.instances).toHaveLength(2)
    expect(MockXhr.instances[1].headers.Authorization).toBe('Bearer NEW_ACCESS')
    expect(progress.mock.calls.map(([value]) => value)).toEqual([99, 100])
    MockXhr.prototype.send = originalSend
  })
})

// Hláška o selhaném uložení musí být pro uživatele — nikdy „HTTP 500", název pole ani
// serializační hláška .NET (viz CLAUDE.md §6: žádné technické detaily v UI).
describe('saveErrorMessage', () => {
  const fallback = 'Klienta se nepodařilo uložit.'

  it('upřednostní srozumitelný detail z ProblemDetails', () => {
    const e = new ApiError(409, 'Conflict', { detail: 'Klient má faktury.' })
    expect(saveErrorMessage(e, fallback)).toBe('Klient má faktury.')
  })

  it('u validace po polích připojí hlášky polí, ale ne jejich názvy', () => {
    const e = new ApiError(422, 'One or more validation errors occurred.', {
      errors: { Ico: ['Neplatné IČO.'], 'BankAccount.Iban': ['Neplatný IBAN.'] },
    })
    expect(saveErrorMessage(e, fallback)).toBe(`${fallback} Neplatné IČO. Neplatný IBAN.`)
  })

  it('zahodí serializační hlášky .NET a použije fallback', () => {
    const e = new ApiError(422, 'One or more validation errors occurred.', {
      errors: { request: ['The request field is required.'] },
    })
    expect(saveErrorMessage(e, fallback)).toBe(fallback)
  })

  it('nikdy nezobrazí holý HTTP status', () => {
    expect(saveErrorMessage(new ApiError(500, 'HTTP 500'), fallback)).toBe(fallback)
  })

  it('propustí hlášku vyrobenou ve frontendu (bez těla odpovědi)', () => {
    const e = new ApiError(422, 'Vyberte klienta — bez něj doklad nelze uložit.')
    expect(saveErrorMessage(e, fallback)).toBe('Vyberte klienta — bez něj doklad nelze uložit.')
  })

  it('vypršelou relaci pojmenuje a chybu bez odpovědi svede na připojení', () => {
    expect(saveErrorMessage(new ApiError(401, 'Unauthorized'), fallback)).toMatch(/Přihlášení/)
    expect(saveErrorMessage(new TypeError('Failed to fetch'), fallback)).toBe(
      `${fallback} Zkontrolujte připojení k serveru.`,
    )
  })
})
