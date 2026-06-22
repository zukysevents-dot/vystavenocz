import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Company } from '@/lib/types'

// MVP mock — profil firmy žije v localStorage. Naplní onboarding (F3-36) a nastavení (F7).
const STORAGE_KEY = 'vystaveno.company.v1'

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
  }
}

export const useCompanyStore = defineStore('company', () => {
  const company = ref<Company | null>(null)
  const initialized = ref(false)

  function persist(): void {
    if (company.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(company.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  function init(): void {
    if (initialized.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      company.value = raw ? (JSON.parse(raw) as Company) : null
    } catch {
      company.value = null
    }
    initialized.value = true
  }

  // Uloží/aktualizuje profil firmy. Chybějící pole doplní z aktuálního stavu nebo defaultů.
  function save(data: Partial<Company>): void {
    const base = company.value ?? emptyCompany(data.email ?? '', data.fullName ?? null)
    company.value = { ...base, ...data }
    persist()
  }

  return { company, initialized, init, save }
})
