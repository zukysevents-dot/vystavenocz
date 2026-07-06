import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http, isApiMode, setTokens, type Tokens } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import type { Company } from '@/lib/types'
import { normalizeModules, type AppModuleId } from '@/lib/modules'

// Profil firmy. Mock režim → localStorage. API režim → /company (GET/PUT) + /companies (POST založení).
// Backend /company drží jen podmnožinu profilu; frontend-only pole (vatMode 3-stav, číslování faktur,
// invoiceColor, fullName) zůstávají v localStorage overlay — jejich plná podpora na backendu je follow-up.
const STORAGE_KEY = 'vystaveno.company.v1'

// Tvar backend /company (CompanySettingsResponse / UpdateCompanyRequest).
interface AddressDto {
  street: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}
interface BankAccountDto {
  accountNumber: string | null
  iban: string | null
  bic: string | null
}
interface CompanySettingsResponse {
  id: string
  name: string
  ico: string | null
  dic: string | null
  email: string | null
  phone: string | null
  logoUrl: string | null
  defaultDueDays: number
  currency: string
  address: AddressDto | null
  bankAccount: BankAccountDto | null
  publicSlug: string | null
}
interface CreateCompanyResponse {
  company: { id: string; name: string }
  tokens: Tokens
}
interface CompanyModulesResponse {
  modules: string[]
}

function emptyCompany(email: string, fullName: string | null): Company {
  return {
    id: `c_${Math.random().toString(36).slice(2, 10)}`,
    companyName: null,
    fullName,
    email,
    ico: null,
    dic: null,
    vatMode: 'non_payer',
    street: null,
    city: null,
    zip: null,
    country: 'CZ',
    bankAccount: null,
    iban: null,
    swift: null,
    logoUrl: null,
    invoiceColor: null,
    invoiceNumberPrefix: null,
    invoiceNumberFormat: null,
    nextInvoiceSeq: 1,
    defaultPaymentDays: 14,
    publicSlug: null,
  }
}

// backend → frontend (jen pole, která backend zná; ostatní doplní overlay/defaults)
function fromResponse(r: CompanySettingsResponse): Partial<Company> {
  return {
    id: r.id,
    companyName: r.name || null,
    ico: r.ico,
    dic: r.dic,
    email: r.email ?? '',
    logoUrl: r.logoUrl,
    defaultPaymentDays: r.defaultDueDays,
    street: r.address?.street ?? null,
    city: r.address?.city ?? null,
    zip: r.address?.postalCode ?? null,
    country: r.address?.country ?? 'CZ',
    bankAccount: r.bankAccount?.accountNumber ?? null,
    iban: r.bankAccount?.iban ?? null,
    swift: r.bankAccount?.bic ?? null,
    publicSlug: r.publicSlug,
  }
}

// frontend → backend PUT body (UpdateCompanyRequest). Frontend-only pole se neposílají.
function toUpdateRequest(c: Company) {
  return {
    name: c.companyName ?? '',
    ico: c.ico,
    dic: c.dic,
    email: c.email || null,
    phone: null,
    logoUrl: c.logoUrl,
    defaultDueDays: c.defaultPaymentDays,
    currency: 'CZK',
    address: { street: c.street, city: c.city, postalCode: c.zip, country: c.country },
    bankAccount: { accountNumber: c.bankAccount, iban: c.iban, bic: c.swift },
    publicSlug: c.publicSlug,
  }
}

export const useCompanyStore = defineStore('company', () => {
  const company = ref<Company | null>(null)
  const initialized = ref(false)
  const loaded = ref(false) // API: profil už načten ze serveru (zabrání opakovanému fetchi)

  function readCache(): Company | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Company) : null
    } catch {
      return null
    }
  }

  function persist(): void {
    if (company.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(company.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  // Sync: profil z cache (mock i API). Po `load()` se reaktivní pole doplní/přepíšou serverem.
  function init(): void {
    if (initialized.value) return
    company.value = readCache()
    initialized.value = true
  }

  // API režim: načti profil ze serveru (jednou) a slož s lokálním overlayem; mock režim = jen cache.
  async function load(): Promise<void> {
    init()
    if (!isApiMode() || loaded.value) return
    const auth = useAuthStore()
    if (!auth.companyId) return // uživatel ještě nemá firmu (před onboardingem)
    try {
      const r = await http.get<CompanySettingsResponse>('/company')
      const base = company.value ?? emptyCompany(r.email ?? '', null)
      company.value = { ...base, ...fromResponse(r) } // server přebije podporovaná pole, overlay zůstává
      loaded.value = true
      persist()
    } catch {
      /* síť/401 — necháme cache; přihlášení řeší guard appky */
    }
  }

  // Uloží profil. Mock: localStorage. API: založí firmu (nemá-li ji) + uloží nastavení na /company.
  // Async — volající (onboarding/nastavení) musí awaitovat a ošetřit ApiError.
  async function save(data: Partial<Company>): Promise<void> {
    const base = company.value ?? emptyCompany(data.email ?? '', data.fullName ?? null)
    const merged: Company = { ...base, ...data }

    if (isApiMode()) {
      const auth = useAuthStore()
      // Bez firmy (onboarding) → nejdřív ji založ; POST /companies vrátí nové tokeny s companyId/role.
      if (!auth.companyId) {
        const res = await http.post<CreateCompanyResponse>('/companies', {
          name: merged.companyName ?? '',
        })
        setTokens(res.tokens)
        await auth.reloadMe()
        merged.id = res.company.id
      }
      const r = await http.put<CompanySettingsResponse>('/company', toUpdateRequest(merged))
      company.value = { ...merged, ...fromResponse(r) }
      loaded.value = true
    } else {
      company.value = merged
    }
    persist()
  }

  async function loadModules(): Promise<AppModuleId[]> {
    const auth = useAuthStore()
    if (!isApiMode() || !auth.companyId) return auth.modules

    const response = await http.get<CompanyModulesResponse>('/company/modules')
    const modules = normalizeModules(response.modules)
    auth.modules = modules
    return modules
  }

  async function saveModules(modules: AppModuleId[]): Promise<AppModuleId[]> {
    const normalized = normalizeModules(modules)
    const auth = useAuthStore()

    if (isApiMode()) {
      const response = await http.put<CompanyModulesResponse>('/company/modules', {
        modules: normalized,
      })
      auth.modules = normalizeModules(response.modules)
      await auth.reloadMe()
      return auth.modules
    }

    auth.modules = normalized
    return normalized
  }

  return { company, initialized, init, load, save, loadModules, saveModules }
})
