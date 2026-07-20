import { describe, it, expect, vi, beforeEach } from 'vitest'
import { API_TOKEN_SCOPES, useApiTokens } from '@/composables/useApiTokens'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useApiTokens - kontrakt volání', () => {
  it('list čte GET /api-tokens', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useApiTokens().list()
    expect(http.get).toHaveBeenCalledWith('/api-tokens')
  })

  it('create posílá název, scopes a expiraci; odpověď nese plaintext token JEN teď', async () => {
    vi.mocked(http.post).mockResolvedValue({
      id: 't1',
      name: 'E-shop',
      token: 'vst_tajny-token',
      tokenPrefix: 'vst_tajny-to',
    } as never)
    const created = await useApiTokens().create({
      name: 'E-shop',
      scopes: ['products.read', 'sales.read'],
      expiresAt: null,
    })
    expect(http.post).toHaveBeenCalledWith('/api-tokens', {
      name: 'E-shop',
      scopes: ['products.read', 'sales.read'],
      expiresAt: null,
    })
    expect(created.token).toBe('vst_tajny-token')
  })

  it('revoke volá DELETE /api-tokens/{id}', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useApiTokens().revoke('t1')
    expect(http.del).toHaveBeenCalledWith('/api-tokens/t1')
  })

  it('katalog scopes odpovídá backend ApiScopes (V1 read + V2 write)', () => {
    expect(API_TOKEN_SCOPES.map((s) => s.value)).toEqual([
      'products.read',
      'customers.read',
      'invoices.read',
      'sales.read',
      'stock.read',
      'clients.read',
      'clients.write',
      'customers.write',
      'products.write',
      'invoices.write',
    ])
  })
})
