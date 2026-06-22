import { ref } from 'vue'
import { toast } from '@/components/ui/sonner'

// MVP mock ARES — žádné reálné API. Vrací data pro pár známých IČO + generický fallback.
// Reálný lookup (ARES REST) se doplní později; rozhraní (lookup/loading/data/reset) zůstane.
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

  async function lookup(rawIco: string): Promise<AresResult | null> {
    const cleaned = rawIco.replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(cleaned)) {
      toast.error('Zadejte platné IČO (6–8 číslic).')
      return null
    }
    loading.value = true
    data.value = null
    await new Promise((resolve) => setTimeout(resolve, 500)) // simulace síťového dotazu
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
    toast.success(`Načteno: ${result.companyName}`)
    return result
  }

  function reset(): void {
    data.value = null
  }

  return { lookup, loading, data, reset }
}
