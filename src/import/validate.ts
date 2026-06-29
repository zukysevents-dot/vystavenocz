import type { ClientInput } from '@/composables/useClients'
import type { ProductInput } from '@/composables/useProducts'
import type { ValidationIssue } from './types'
import { isValidIco } from './normalize'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Zvaliduje draft klienta. `error` blokuje import řádku, `warning` jen upozorní
 * (např. neplatné IČO může být zahraniční subjekt — necháme uživatele rozhodnout).
 */
export function validateClient(value: Partial<ClientInput>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!value.name || !value.name.trim()) {
    issues.push({ field: 'name', level: 'error', message: 'Chybí název klienta.' })
  }
  if (value.ico && !isValidIco(value.ico)) {
    issues.push({
      field: 'ico',
      level: 'warning',
      message: 'IČO neprošlo kontrolou (může jít o zahraniční subjekt).',
    })
  }
  if (value.email && !EMAIL_RE.test(value.email)) {
    issues.push({ field: 'email', level: 'warning', message: 'E-mail nevypadá platně.' })
  }
  return issues
}

/** Zvaliduje draft produktu. Název je povinný; cena je jen upozornění. */
export function validateProduct(value: Partial<ProductInput>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!value.name || !value.name.trim()) {
    issues.push({ field: 'name', level: 'error', message: 'Chybí název produktu.' })
  }
  if (typeof value.salePrice === 'number' && value.salePrice < 0) {
    issues.push({ field: 'salePrice', level: 'warning', message: 'Záporná prodejní cena.' })
  }
  return issues
}

/** Má řádek blokující chybu (která brání vytvoření)? */
export function hasBlockingError(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === 'error')
}
