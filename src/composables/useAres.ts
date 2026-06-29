import { ref } from 'vue'
import { toast } from '@/components/ui/sonner'
import { http, isApiMode, ApiError } from '@/lib/http'

// ARES lookup firmy podle IČO.
//  - API režim: přes backend proxy `GET /ares/{ico}` (ten volá ares.gov.cz server-side → bez CORS).
//  - Mock režim (bez VITE_API_URL): data pro pár známých IČO + generický fallback (vývoj bez backendu).
// Rozhraní (lookup/loading/data/reset) je v obou režimech stejné.
export type AresResult = {
  ico: string
  dic: string | null
  companyName: string | null
  street: string | null
  city: string | null
  zip: string | null
  country: string
}

const KNOWN: Record<string, Omit<AresResult, 'ico'>> = {
  '27082440': {
    dic: 'CZ27082440',
    companyName: 'Alza.cz a.s.',
    street: 'Jankovcova 1522/53',
    city: 'Praha 7',
    zip: '17000',
    country: 'CZ',
  },
  '45317054': {
    dic: 'CZ45317054',
    companyName: 'ŠKODA AUTO a.s.',
    street: 'tř. Václava Klementa 869',
    city: 'Mladá Boleslav',
    zip: '29301',
    country: 'CZ',
  },
}

export function useAres() {
  const loading = ref(false)
  const data = ref<AresResult | null>(null)

  // `silent` potlačí toasty — pro dávkové doplnění (import) by jinak spamovaly.
  async function lookup(rawIco: string, opts?: { silent?: boolean }): Promise<AresResult | null> {
    const silent = opts?.silent ?? false
    const cleaned = rawIco.replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(cleaned)) {
      if (!silent) toast.error('Zadejte platné IČO (6–8 číslic).')
      return null
    }
    loading.value = true
    data.value = null

    if (isApiMode()) {
      try {
        const result = await http.get<AresResult>(`/ares/${cleaned}`)
        data.value = result
        if (!silent)
          toast.success(result.companyName ? `Načteno: ${result.companyName}` : 'Firma načtena.')
        return result
      } catch (e) {
        if (!silent) {
          const msg =
            e instanceof ApiError && e.status === 404
              ? 'Firma s tímto IČO nebyla v ARES nalezena.'
              : 'Načtení z ARES selhalo. Zkuste to znovu.'
          toast.error(msg)
        }
        return null
      } finally {
        loading.value = false
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500)) // mock: simulace síťového dotazu
    const known = KNOWN[cleaned]
    const result: AresResult = known
      ? { ico: cleaned, ...known }
      : {
          ico: cleaned,
          dic: cleaned.length === 8 ? `CZ${cleaned}` : null,
          companyName: `Firma ${cleaned} s.r.o.`,
          street: 'Ukázková 123',
          city: 'Praha',
          zip: '11000',
          country: 'CZ',
        }
    data.value = result
    loading.value = false
    if (!silent) toast.success(`Načteno: ${result.companyName}`)
    return result
  }

  function reset(): void {
    data.value = null
  }

  return { lookup, loading, data, reset }
}
