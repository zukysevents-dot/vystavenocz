import type { RawTable } from '../types'

/** Mapování našich polí → názvy tagů klienta v Fakturoid invoice XML. */
const CLIENT_TAGS: { header: string; tag: string }[] = [
  { header: 'name', tag: 'client_name' },
  { header: 'ico', tag: 'client_registration_no' },
  { header: 'dic', tag: 'client_vat_no' },
  { header: 'street', tag: 'client_street' },
  { header: 'city', tag: 'client_city' },
  { header: 'zip', tag: 'client_zip' },
  { header: 'country', tag: 'client_country' },
]

/**
 * Vytáhne UNIKÁTNÍ klienty z Fakturoid XML exportu faktur.
 *
 * Export faktur (`<invoices><invoice>…`) obsahuje u každé faktury kompletní
 * data odběratele (`client_*`). Stejný klient se opakuje napříč fakturami →
 * deduplikujeme podle IČO (fallback název). Výstup jsou hlavičky = názvy našich
 * polí, takže navazuje rovnou na generický adaptér klientů.
 */
export function parseFakturoidClientsXml(text: string): RawTable {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Soubor není platné XML.')
  }
  const invoices = Array.from(doc.getElementsByTagName('invoice'))
  if (!invoices.length) {
    throw new Error('XML nevypadá jako export faktur z Fakturoidu (chybí <invoice>).')
  }

  const headers = CLIENT_TAGS.map((c) => c.header)
  const seen = new Set<string>()
  const rows: Record<string, string>[] = []
  for (const inv of invoices) {
    const get = (tag: string) => inv.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
    const row: Record<string, string> = {}
    for (const c of CLIENT_TAGS) row[c.header] = get(c.tag)
    if (!row.name) continue
    const key = (row.ico || row.name).toLowerCase()
    if (seen.has(key)) continue // stejný klient se opakuje napříč fakturami
    seen.add(key)
    rows.push(row)
  }
  return { headers, rows }
}
