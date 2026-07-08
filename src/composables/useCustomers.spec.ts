import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCustomers } from '@/composables/useCustomers'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCustomers - kontrakt volání', () => {
  it('list volá GET /customers s výchozím řazením podle jména', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)
    await useCustomers().list()
    expect(http.get).toHaveBeenCalledWith('/customers?pageSize=100&sort=name')
  })

  it('list pošle oříznuté hledání a velikost stránky', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)
    await useCustomers().list('  Jana  ', 25)
    expect(http.get).toHaveBeenCalledWith('/customers?pageSize=25&sort=name&search=Jana')
  })

  it('create čistí volitelný kontakt na null místo prázdného stringu', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'cust-1' } as never)
    await useCustomers().create({ name: '  Jana Nováková  ', phone: ' ', email: '' })
    expect(http.post).toHaveBeenCalledWith('/customers', {
      name: 'Jana Nováková',
      phone: null,
      email: null,
    })
  })

  it('update volá PUT /customers/{id}', async () => {
    vi.mocked(http.put).mockResolvedValue({ id: 'cust-1' } as never)
    await useCustomers().update('cust-1', {
      name: 'Jan',
      phone: ' 777 111 222 ',
      email: ' jan@example.cz ',
    })
    expect(http.put).toHaveBeenCalledWith('/customers/cust-1', {
      name: 'Jan',
      phone: '777 111 222',
      email: 'jan@example.cz',
    })
  })

  it('loyalty čte bodový ledger zákazníka', async () => {
    vi.mocked(http.get).mockResolvedValue({
      customerId: 'cust-1',
      balance: 10,
      entries: [],
    } as never)
    await useCustomers().loyalty('cust-1')
    expect(http.get).toHaveBeenCalledWith('/customers/cust-1/loyalty')
  })

  it('adjust zapíše ruční úpravu bodů s oříznutou poznámkou', async () => {
    vi.mocked(http.post).mockResolvedValue({
      customerId: 'cust-1',
      balance: 15,
      entries: [],
    } as never)
    await useCustomers().adjust('cust-1', 5, '  kompenzace  ')
    expect(http.post).toHaveBeenCalledWith('/customers/cust-1/loyalty/adjust', {
      points: 5,
      note: 'kompenzace',
    })
  })
})
