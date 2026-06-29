import type { ClientInput } from '@/composables/useClients'
import type { ImportSourceAdapter } from '../types'
import { normalizeIco, normalizeDic, normalizePhone, trimOrNull } from '../normalize'

/** Univerzální adaptér pro klienty z libovolného CSV/XLSX (hlavičky = názvy polí). */
export const genericClients: ImportSourceAdapter<ClientInput> = {
  id: 'generic-clients',
  source: 'CSV / XLSX',
  entity: 'clients',
  label: 'Obecný soubor — klienti',
  defaultMapping: {
    name: 'name',
    ico: 'ico',
    dic: 'dic',
    email: 'email',
    phone: 'phone',
    street: 'street',
    city: 'city',
    zip: 'zip',
    country: 'country',
    notes: 'notes',
  },
  transform: (_row, m) => ({
    name: (m.name ?? '').trim(),
    ico: normalizeIco(m.ico),
    dic: normalizeDic(m.dic),
    email: trimOrNull(m.email)?.toLowerCase() ?? null,
    phone: normalizePhone(m.phone),
    street: trimOrNull(m.street),
    city: trimOrNull(m.city),
    zip: m.zip ? m.zip.replace(/\s/g, '') : null,
    country: trimOrNull(m.country) ?? 'CZ',
    defaultPaymentDays: 14,
    notes: trimOrNull(m.notes),
  }),
}
