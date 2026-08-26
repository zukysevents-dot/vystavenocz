import { ref } from 'vue'
import { http, isApiMode } from '@/lib/http'

// Samoobslužný nákup modulů z ceníku. Stránka NIC neaktivuje — jen si vyžádá adresu platební
// stránky a přesměruje tam zákazníka. Nárok na modul zapisuje výhradně ověřený webhook na serveru,
// takže návrat z platby není potvrzení úhrady (stejné pravidlo jako u online platby faktur).
// Jen API režim; v náhledu se nákup vůbec nenabízí.

export type BillingPeriod = 'monthly' | 'yearly'

export interface CatalogItem {
  key: string
  name: string
  kind: 'Module' | 'Bundle'
  modules: string[]
  monthlyNet: number
  yearlyNet: number
  /** Firma už na všechny moduly položky nárok má — nemá smysl kupovat znovu. */
  owned: boolean
}

export interface SubscriptionCatalog {
  items: CatalogItem[]
  currency: string
  vatRatePercent: number
  trialEndsAt: string | null
  /** Je platební brána spuštěná? Bez ní se nákup nesmí nabízet. */
  canCheckout: boolean
  hasBillingAccount: boolean
}

export function useSubscriptionPurchase() {
  const catalog = ref<SubscriptionCatalog | null>(null)
  const loading = ref(false)
  const busy = ref(false)

  async function load(): Promise<void> {
    if (!isApiMode()) return
    loading.value = true
    try {
      catalog.value = await http.get<SubscriptionCatalog>('/subscription/catalog')
    } finally {
      loading.value = false
    }
  }

  /** Vrátí adresu platební stránky. Přesměrování dělá volající. */
  async function checkout(items: string[], period: BillingPeriod): Promise<string> {
    busy.value = true
    try {
      const res = await http.post<{ redirectUrl: string }>('/subscription/checkout', {
        items,
        period,
      })
      return res.redirectUrl
    } finally {
      busy.value = false
    }
  }

  /** Samoobsluha u brány (karta, faktury, zrušení). null = firma si zatím nic nekoupila. */
  async function openPortal(): Promise<string | null> {
    busy.value = true
    try {
      const res = await http.post<{ redirectUrl: string } | null>('/subscription/portal')
      return res?.redirectUrl ?? null
    } finally {
      busy.value = false
    }
  }

  return { catalog, loading, busy, load, checkout, openPortal }
}
