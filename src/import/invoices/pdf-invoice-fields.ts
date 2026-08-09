import { normalizeRegistrationId, parseCzechAmount, parseCzechDate } from './shared'

/**
 * Vytěžení polí české faktury z textu PDF.
 *
 * Tohle je odhad, ne čtení dat. PDF nese jen text a jeho pozici — žádné
 * „tady je částka". Proto každý nález nese i to, jestli se povedl, a volající
 * musí umět říct „zkontroluj to". Radši pole nevyplnit než vyplnit špatně:
 * chybějící datum uživatel doplní, ale špatně přečtená částka jde do účetnictví.
 *
 * Funkce je schválně bez závislosti na pdf.js, aby šla testovat nad textem.
 */

/** Jedna strana dokladu tak, jak se povedla přečíst. */
export interface ExtractedParty {
  name: string | null
  ico: string | null
  dic: string | null
  street: string | null
  city: string | null
  zip: string | null
}

/** Jeden řádek rekapitulace DPH (sazba → základ). */
export interface ExtractedVatRow {
  rate: number
  base: number
  vat: number
}

export interface ExtractedInvoiceFields {
  invoiceNumber: string | null
  issueDate: string | null
  dueDate: string | null
  taxableDate: string | null
  variableSymbol: string | null
  total: number | null
  subtotal: number | null
  vatTotal: number | null
  currency: string
  /**
   * Doklad vypadá jako od plátce DPH (nese DIČ nebo daň vyčísluje) a zároveň
   * se neoznačuje za neplátce. Potřeba tam, kde se DIČ nepodařilo přiřadit
   * ke straně — bez toho by se faktura s DPH naimportovala jako bez daně.
   */
  vatHint: boolean
  vatRows: ExtractedVatRow[]
  supplier: ExtractedParty
  customer: ExtractedParty
  /** Strany, které se nepodařilo přiřadit ke straně dokladu — pořadí výskytu. */
  unassignedParties: ExtractedParty[]
}

const ICO_RE = /I[ČC]O?\s*:?\s*([0-9][0-9\s]{5,11})/gi
const DIC_RE = /DI[ČC]\s*:?\s*(CZ[0-9]{8,10}|SK[0-9]{9,10})/gi
// Město se hledá jen do konce řádku — `\s` by přeteklo přes nový řádek
// a z „602 00 Brno\nIČO: …" by udělalo město „Brno IČO".
const ZIP_CITY_RE = /(\d{3}[ ]?\d{2})[ \t]+([A-Za-zÁ-Žá-ž][A-Za-zÁ-Žá-ž .-]{1,40})/

/**
 * Vrátí zbytek řádku za popiskem, případně následující neprázdný řádek.
 *
 * Popisky se zkoušejí v pořadí, v jakém přijdou — teprve když se nikde v textu
 * nenajde ten první, jde se na další. Pořadí je tedy priorita: „Celkem k úhradě"
 * musí vyhrát nad „Celkem", které bývá i v hlavičce tabulky položek.
 */
function valueAfterLabel(lines: string[], labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:?\\s*`, 'i')
    for (let i = 0; i < lines.length; i++) {
      const m = re.exec(lines[i])
      if (!m) continue
      const rest = lines[i].slice(m.index + m[0].length).trim()
      if (rest) return rest
      // Popisek stojí na vlastním řádku (typické v tabulkách) → hodnota je pod ním.
      const next = lines[i + 1]?.trim()
      if (next) return next
    }
  }
  return null
}

/** Najde datum u některého z popisků. */
function dateAfterLabel(lines: string[], labels: string[]): string | null {
  const raw = valueAfterLabel(lines, labels)
  return raw ? parseCzechDate(raw) : null
}

/**
 * Najde částku u popisku. Bere POSLEDNÍ číslo na řádku — v účetních sestavách
 * stojí popisek vlevo a částka vpravo, mezi nimi bývá ještě sazba nebo měna.
 */
function amountAfterLabel(lines: string[], labels: string[]): number | null {
  const raw = valueAfterLabel(lines, labels)
  if (!raw) return null
  const numbers = raw.match(/-?[\d\s ]+(?:[.,]\d{1,2})?/g)
  if (!numbers) return null
  for (let i = numbers.length - 1; i >= 0; i--) {
    const parsed = parseCzechAmount(numbers[i])
    if (parsed !== null && Math.abs(parsed) > 0) return parsed
  }
  return null
}

/**
 * Číslo faktury. Vedle popisků zkouší i typický tvar v nadpisu
 * („Faktura – daňový doklad 2024/0042"), protože ho hodně programů netituluje.
 */
function extractInvoiceNumber(lines: string[]): string | null {
  const labelled = valueAfterLabel(lines, [
    'Faktura\\s*[-–—]?\\s*da[ňn]ov[ýy]\\s+doklad\\s*(?:č|c)?\\.?',
    '(?:Č|C)íslo\\s+(?:faktury|dokladu)',
    'Faktura\\s+(?:č|c)\\.?',
    'Doklad\\s+(?:č|c)\\.?',
    'Da[ňn]ov[ýy]\\s+doklad\\s+(?:č|c)?\\.?',
    'Invoice\\s+(?:number|no)\\.?',
  ])
  if (labelled) {
    // Z řádku vezmi jen samotný identifikátor — za ním často pokračuje další popisek.
    const token = /([A-Z0-9][A-Z0-9/\-_]{2,})/i.exec(labelled)
    if (token) return token[1].replace(/[.,;]$/, '')
  }
  return null
}

const LEGAL_FORM =
  /(spol\.\s*s\s*r\.\s*o\.|s\.\s*r\.\s*o\.|a\.\s*s\.|v\.\s*o\.\s*s\.|k\.\s*s\.|z\.\s*s\.|o\.\s*p\.\s*s\.|s\.\s*p\.)/gi

/**
 * Rozdělí slepený dvousloupcový řádek na levou a pravou stranu.
 *
 * Na faktuře stojí dodavatel a odběratel vedle sebe, takže po převodu PDF na
 * řádky skončí oba v jednom. Dělicím bodem je konec první právní formy —
 * „Truhlářství Novák s.r.o. Stavby Dvořák a.s." se rozpadne správně.
 */
function splitTwoColumn(line: string): [string, string] | null {
  const matches = [...line.matchAll(LEGAL_FORM)]
  if (matches.length < 2) return null
  const cut = (matches[0].index ?? 0) + matches[0][0].length
  return [line.slice(0, cut).trim(), line.slice(cut).trim()]
}

const LABEL_PREFIX = /^(dodavatel|odb[ěe]ratel|zákazník|klient|p[řr]íjemce|firma)\s*:?\s*/i

/**
 * Odřízne popiskové předpony. Opakovaně, protože dvousloupcová hlavička dá
 * řádek „Dodavatel Odběratel" — ten se má vyprázdnit celý, ne stát se jménem.
 */
function stripLabels(line: string): string {
  let out = line.trim()
  while (LABEL_PREFIX.test(out)) out = out.replace(LABEL_PREFIX, '').trim()
  return out
}

/** Všechny výskyty vzoru v bloku — v dvousloupcovém rozložení je jich víc. */
function collectAll(block: string[], source: string): string[] {
  const re = new RegExp(source, 'gi')
  return [...block.join('\n').matchAll(re)].map((m) => m[1])
}

/**
 * Poskládá stranu dokladu z bloku řádků.
 *
 * `occurrence` říká, kolikátý údaj v pořadí patří téhle straně: u dvousloupcové
 * hlavičky je dodavatel první a odběratel druhý.
 */
function partyFromBlock(block: string[], occurrence = 0): ExtractedParty {
  const icos = collectAll(block, ICO_RE.source)
  const dics = collectAll(block, DIC_RE.source)
  const zipCities = [...block.join('\n').matchAll(new RegExp(ZIP_CITY_RE.source, 'g'))]
  const zipCity = zipCities[occurrence]

  // Název = první řádek, který nevypadá jako nadpis, číslo ani kontakt.
  // Popisek se z řádku odřízne, ne zahodí — „Zákazník Beta s.r.o." nese i jméno.
  const nameLine = block
    .map(stripLabels)
    .find(
      (l) =>
        l.length > 2 &&
        !/faktura|da[ňn]ov[ýy]\s+doklad|celkem|datum|splatnos|rekapitulace|variabiln/i.test(l) &&
        !/I[ČC]O?\s*:?\s*\d|DI[ČC]|^\d|tel|e-?mail|www|@/i.test(l),
    )
  const columns = nameLine ? splitTwoColumn(nameLine) : null
  const name = columns ? columns[occurrence] : occurrence === 0 ? nameLine : undefined

  // Ulice se ve dvousloupcovém řádku spolehlivě rozdělit nedá — radši ji necháme
  // prázdnou, než abychom klientovi uložili kus cizí adresy.
  const street = columns
    ? null
    : (block.find((l) => /\d/.test(l) && /^[A-Za-zÁ-Žá-ž].*\s\d+/.test(l)) ?? null)

  return {
    name: name?.replace(/\s{2,}/g, ' ').trim() || null,
    ico: icos[occurrence] ? normalizeRegistrationId(icos[occurrence]) : null,
    dic: dics[occurrence] ? normalizeRegistrationId(dics[occurrence]) : null,
    street,
    city: zipCity ? zipCity[2].trim() : null,
    zip: zipCity ? zipCity[1].replace(/\s/g, '') : null,
  }
}

const EMPTY_PARTY: ExtractedParty = {
  name: null,
  ico: null,
  dic: null,
  street: null,
  city: null,
  zip: null,
}

/** Strana, ze které se nepodařilo přečíst nic použitelného. */
export function isEmptyParty(p: ExtractedParty): boolean {
  return !p.name && !p.ico && !p.dic
}

/**
 * Kandidáti na strany dokladu — jeden na každé nalezené IČO.
 *
 * Blok končí na řádku s IČO a další začíná až za ním, aby si dvě strany pod
 * sebou navzájem nepřebraly identifikátor ani jméno.
 */
function partyCandidates(lines: string[]): ExtractedParty[] {
  const candidates: ExtractedParty[] = []
  let blockStart = 0
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    if (!new RegExp(ICO_RE.source, 'i').test(lines[i])) continue
    candidates.push(partyFromBlock(lines.slice(blockStart, i + 1)))
    blockStart = i + 1
  }
  return candidates
}

/**
 * Rozdělí hlavičku na dodavatele a odběratele podle popisků. Když popisky
 * chybí, vrátí strany nepřiřazené — o tom, kdo je kdo, rozhoduje až dávka
 * (napříč fakturami se dodavatel opakuje, odběratelé se mění).
 */
function extractParties(
  lines: string[],
): Pick<ExtractedInvoiceFields, 'supplier' | 'customer' | 'unassignedParties'> {
  const supplierIdx = lines.findIndex((l) => /^\s*dodavatel\b/i.test(l))
  const customerIdx = lines.findIndex((l) => /^\s*(odb[ěe]ratel|zákazník|p[řr]íjemce)\b/i.test(l))

  // Oba popisky na jednom řádku = dvousloupcová hlavička. Blok je pro obě strany
  // společný a rozlišuje se pořadím údajů, ne pozicí řádku.
  const sameLine = supplierIdx > -1 && supplierIdx === customerIdx
  const bothLabelled = supplierIdx > -1 && customerIdx > -1
  const twoColumn =
    sameLine ||
    (bothLabelled && Math.abs(customerIdx - supplierIdx) <= 1) ||
    (supplierIdx > -1 && customerIdx === -1 && /odb[ěe]ratel/i.test(lines[supplierIdx]))

  if (supplierIdx > -1 || customerIdx > -1) {
    const BLOCK = 8
    if (twoColumn) {
      const start = supplierIdx > -1 ? supplierIdx : customerIdx
      const block = lines.slice(start, start + BLOCK)
      return {
        supplier: partyFromBlock(block, 0),
        customer: partyFromBlock(block, 1),
        unassignedParties: [],
      }
    }
    const supplier =
      supplierIdx > -1
        ? partyFromBlock(lines.slice(supplierIdx, supplierIdx + BLOCK))
        : { ...EMPTY_PARTY }
    const customer =
      customerIdx > -1
        ? partyFromBlock(lines.slice(customerIdx, customerIdx + BLOCK))
        : { ...EMPTY_PARTY }
    // Jeden popisek našel jen jednu stranu (typicky „Zákazník" bez „Dodavatel").
    // Kandidáty předáme dál — dávka pozná chybějící stranu podle opakování.
    const unassignedParties =
      isEmptyParty(supplier) || isEmptyParty(customer) ? partyCandidates(lines) : []
    return { supplier, customer, unassignedParties }
  }

  // Bez popisků: rozhodnutí, kdo je kdo, nechá na dávce.
  return {
    supplier: { ...EMPTY_PARTY },
    customer: { ...EMPTY_PARTY },
    unassignedParties: partyCandidates(lines),
  }
}

/**
 * Rekapitulace DPH — tabulka „sazba | základ | daň". Když ji najdeme, importují
 * se položky podle sazeb a součty sedí na originál i u faktur s více sazbami.
 */
function extractVatRows(lines: string[]): ExtractedVatRow[] {
  const rows: ExtractedVatRow[] = []
  for (const line of lines) {
    // „21 % 1 000,00 210,00" — sazba následovaná aspoň dvěma částkami.
    const m = /(\d{1,2})\s*%\s+(-?[\d\s ]+(?:[.,]\d{1,2})?)\s+(-?[\d\s ]+(?:[.,]\d{1,2})?)/.exec(
      line,
    )
    if (!m) continue
    const rate = Number(m[1])
    const base = parseCzechAmount(m[2])
    const vat = parseCzechAmount(m[3])
    if (base === null || vat === null) continue
    if (![0, 10, 12, 15, 21].includes(rate)) continue
    if (rows.some((r) => r.rate === rate)) continue
    rows.push({ rate, base, vat })
  }
  return rows
}

/** Vytěží z textu PDF všechna pole, která se povede rozpoznat. */
export function extractInvoiceFields(text: string): ExtractedInvoiceFields {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const total =
    amountAfterLabel(lines, [
      'Celkem\\s+k\\s+úhrad[ěe]',
      'K\\s+úhrad[ěe]',
      'Celkov[áa]\\s+částka',
      'Cena\\s+celkem',
      'Celkem\\s+s\\s+DPH',
      'Celkem',
      'Total',
    ]) ?? null

  const subtotal =
    amountAfterLabel(lines, [
      'Základ\\s+dan[ěe]',
      'Celkem\\s+bez\\s+DPH',
      'Cena\\s+bez\\s+DPH',
      'Bez\\s+DPH',
    ]) ?? null

  const vatTotal =
    amountAfterLabel(lines, ['DPH\\s+celkem', 'Celkem\\s+DPH', 'Da[ňn]\\s+celkem']) ?? null

  const currency = /\b(EUR|€)\b/.test(text) && !/\bK[čc]\b/.test(text) ? 'EUR' : 'CZK'

  const declaresNonPayer = /nejsme\s+pl[áa]tc|nepl[áa]tc[ei]\s+DPH|nen[íi]\s+pl[áa]tc/i.test(text)
  const vatHint = !declaresNonPayer && (/DI[ČC]\s*:?\s*(CZ|SK)/i.test(text) || vatTotal !== null)

  return {
    invoiceNumber: extractInvoiceNumber(lines),
    issueDate: dateAfterLabel(lines, [
      'Datum\\s+vystaven[íi]',
      'Vystaveno\\s+dne',
      'Vystaveno',
      'Datum\\s+vyst\\.?',
      'Issue\\s+date',
    ]),
    dueDate: dateAfterLabel(lines, [
      'Datum\\s+splatnosti',
      'Splatnost\\s+dne',
      'Splatnost',
      'Splatno\\s+dne',
      'Due\\s+date',
    ]),
    taxableDate: dateAfterLabel(lines, [
      'Datum\\s+zdaniteln[ée]ho\\s+pln[ěe]n[íi]',
      'Datum\\s+usk\\.?\\s*zdan\\.?\\s*pln[ěe]n[íi]',
      'DUZP',
      'Datum\\s+pln[ěe]n[íi]',
    ]),
    variableSymbol:
      valueAfterLabel(lines, ['Variabiln[íi]\\s+symbol', 'VS'])?.match(/\d{1,10}/)?.[0] ?? null,
    total,
    subtotal,
    vatTotal,
    currency,
    vatHint,
    vatRows: extractVatRows(lines),
    ...extractParties(lines),
  }
}
