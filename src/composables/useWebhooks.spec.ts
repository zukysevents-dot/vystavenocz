import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WEBHOOK_EVENTS, useWebhooks } from '@/composables/useWebhooks'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useWebhooks - kontrakt volání', () => {
  it('list čte GET /webhook-subscriptions', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useWebhooks().list()
    expect(http.get).toHaveBeenCalledWith('/webhook-subscriptions')
  })

  it('create posílá URL + eventy; odpověď nese signing secret JEN teď', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'w1', secret: 'whsec_tajny' } as never)
    const created = await useWebhooks().create({
      url: 'https://example.com/hook',
      events: ['sale.completed'],
      isEnabled: true,
    })
    expect(http.post).toHaveBeenCalledWith('/webhook-subscriptions', {
      url: 'https://example.com/hook',
      events: ['sale.completed'],
      isEnabled: true,
    })
    expect(created.secret).toBe('whsec_tajny')
  })

  it('update volá PUT /webhook-subscriptions/{id} (secret se nemění ani nevrací)', async () => {
    vi.mocked(http.put).mockResolvedValue({ id: 'w1' } as never)
    await useWebhooks().update('w1', {
      url: 'https://example.com/hook2',
      events: ['invoice.paid'],
      isEnabled: false,
    })
    expect(http.put).toHaveBeenCalledWith('/webhook-subscriptions/w1', {
      url: 'https://example.com/hook2',
      events: ['invoice.paid'],
      isEnabled: false,
    })
  })

  it('remove volá DELETE, sendTest POST /test a deliveries čte stránkovanou historii', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    vi.mocked(http.post).mockResolvedValue({ eventId: 'e1' } as never)
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 20 } as never)

    const api = useWebhooks()
    await api.remove('w1')
    expect(http.del).toHaveBeenCalledWith('/webhook-subscriptions/w1')

    await api.sendTest('w1')
    expect(http.post).toHaveBeenCalledWith('/webhook-subscriptions/w1/test', {})

    await api.deliveries('w1', 2)
    expect(http.get).toHaveBeenCalledWith('/webhook-subscriptions/w1/deliveries?page=2&pageSize=20')
  })

  it('katalog eventů kryje faktury, prodeje, zákazníky, produkty a sklad', () => {
    const values = WEBHOOK_EVENTS.map((e) => e.value)
    expect(values).toContain('invoice.paid')
    expect(values).toContain('sale.completed')
    expect(values).toContain('customer.created')
    expect(values).toContain('product.updated')
    expect(values).toContain('stock.level.changed')
    expect(values).not.toContain('ping') // testovací event si nejde předplatit
  })
})
