import type { Company, SupplierSnapshot } from '@/lib/types'

function empty(v: unknown): boolean {
  return v === null || v === undefined || v === ''
}

/**
 * Z dodavatele (`your_*` na Fakturoid faktuře) vyrobí patch profilu firmy.
 * Vyplní jen pole, která jsou v profilu prázdná — existující údaje nepřepisuje.
 */
export function supplierToCompanyPatch(
  supplier: SupplierSnapshot,
  current: Company | null,
): Partial<Company> {
  const patch: Partial<Company> = {}
  const set = <K extends keyof Company>(key: K, value: Company[K] | null | undefined): void => {
    if (empty(current?.[key]) && !empty(value)) patch[key] = value as Company[K]
  }
  set('companyName', supplier.companyName)
  set('ico', supplier.ico)
  set('dic', supplier.dic)
  set('street', supplier.street)
  set('city', supplier.city)
  set('zip', supplier.zip)
  set('country', supplier.country)
  set('bankAccount', supplier.bankAccount)
  set('iban', supplier.iban)
  set('swift', supplier.swift)
  // vatMode má vždy default ('non_payer'), takže ho přebíráme jen u čerstvého profilu (bez názvu).
  if (empty(current?.companyName) && supplier.vatMode) patch.vatMode = supplier.vatMode
  return patch
}
