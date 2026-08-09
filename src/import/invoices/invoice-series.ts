/**
 * Číselná řada při importu historických faktur.
 *
 * Zákazník přechází z jiného programu a přináší si faktury s vlastním
 * číslováním. Aby po importu mohl fakturovat dál bez díry a bez duplicity,
 * musí aplikace poznat, jak jeho čísla vypadají, a navázat na poslední z nich.
 */

/** Rozebrané číslo faktury na části, ze kterých jde složit další v řadě. */
export interface NumberPattern {
  /** Nečíselná část na začátku, např. „FA". */
  prefix: string
  /** Formát pro `buildInvoiceNumber` — např. `{prefix}-{year}-{seq}`. */
  format: string
  /** Pořadové číslo v roce. */
  seq: number
  /** Rok z čísla, pokud ho obsahuje. */
  year: number | null
  /** Na kolik míst je pořadí doplněné nulami. */
  seqWidth: number
}

const YEAR_RE = /^(19|20)\d{2}$/

interface DigitGroup {
  text: string
  index: number
}

/**
 * Skupiny číslic v čísle. Slepený tvar „FA2024001" je jedna skupina, ale nese
 * rok i pořadí — když začíná rokem a něco za ním zbývá, rozdělí se, jinak by
 * se celé „2024001" pochopilo jako pořadové číslo.
 */
function digitGroups(value: string): DigitGroup[] {
  const groups: DigitGroup[] = []
  for (const m of value.matchAll(/\d+/g)) {
    const text = m[0]
    const index = m.index ?? 0
    if (text.length > 4 && YEAR_RE.test(text.slice(0, 4))) {
      groups.push({ text: text.slice(0, 4), index })
      groups.push({ text: text.slice(4), index: index + 4 })
    } else {
      groups.push({ text, index })
    }
  }
  return groups
}

/**
 * Rozebere číslo faktury na prefix, rok a pořadí.
 *
 * Pořadí je poslední skupina číslic; rok se hledá mezi ostatními skupinami.
 * Zvládne „2024-0042", „FA2024001", „0042/2024" i prosté „0042".
 * Vrací null, když v čísle žádné pořadí není.
 */
export function parseNumberPattern(raw: string): NumberPattern | null {
  const value = raw.trim()
  if (!value) return null

  const groups = digitGroups(value)
  if (!groups.length) return null

  // Rok hledej jen mezi skupinami, které jako rok vypadají — a nikdy jím
  // neobětuj jedinou skupinu, jinak by z „2024" zmizelo pořadí.
  const yearIdx = groups.length > 1 ? groups.findIndex((g) => YEAR_RE.test(g.text)) : -1

  // Pořadí je poslední skupina; když je na konci rok („0042/2024"), tak předposlední.
  const seqIdx =
    yearIdx === groups.length - 1 && groups.length > 1 ? groups.length - 2 : groups.length - 1
  const seqGroup = groups[seqIdx]
  const yearGroup = yearIdx > -1 ? groups[yearIdx] : null

  let format = ''
  let cursor = 0
  for (const g of groups) {
    format += value.slice(cursor, g.index)
    if (g === seqGroup) format += '{seq}'
    else if (g === yearGroup) format += '{year}'
    else format += g.text
    cursor = g.index + g.text.length
  }
  format += value.slice(cursor)

  // Nečíselný začátek je prefix; ve formátu ho nahradíme zástupcem.
  const leading = /^[^\d{]+/.exec(format)?.[0] ?? ''
  const prefix = leading
  if (leading) format = `{prefix}${format.slice(leading.length)}`

  return {
    prefix,
    format,
    seq: Number(seqGroup.text),
    year: yearGroup ? Number(yearGroup.text) : null,
    seqWidth: seqGroup.text.length,
  }
}

/** Návrh, jak nastavit číselnou řadu firmy, aby navázala na import. */
export interface SeriesSuggestion {
  prefix: string
  format: string
  nextSeq: number
  /** Číslo, které dostane příští vystavená faktura. */
  preview: string
  /** Nejvyšší importované číslo, na které se navazuje. */
  basedOn: string
  /** Rok, ze kterého se navazuje. */
  year: number | null
  /**
   * Import je ze starších let, takže se pořadí nepřebírá a letos začíná od jedné.
   * UI to musí říct nahlas — jinak by uživatel čekal pokračování minulé řady.
   */
  resetForNewYear: boolean
}

/**
 * Z importovaných čísel odvodí, jak má pokračovat číselná řada.
 *
 * Dvě pravidla, obě účetní:
 *  - bere se jen nejnovější rok v dávce (pořadí se každý rok vrací na začátek),
 *  - když je i ten starší než letošek, pořadí se nepřebírá a začíná se od jedné —
 *    navázat letos číslem 44 podle faktur z roku 2024 by řadu rozbilo.
 *
 * Vrací null, když čísla nemají rozpoznatelný tvar.
 */
export function inferSeriesFromNumbers(
  numbers: string[],
  currentYear = new Date().getFullYear(),
): SeriesSuggestion | null {
  const parsed = numbers
    .map((n) => ({ raw: n, pattern: parseNumberPattern(n) }))
    .filter((p): p is { raw: string; pattern: NumberPattern } => p.pattern !== null)
  if (!parsed.length) return null

  const years = parsed.map((p) => p.pattern.year).filter((y): y is number => y !== null)
  const latestYear = years.length ? Math.max(...years) : null

  const inScope = latestYear === null ? parsed : parsed.filter((p) => p.pattern.year === latestYear)
  const best = inScope.reduce((a, b) => (b.pattern.seq > a.pattern.seq ? b : a))

  const { prefix, format } = best.pattern
  const resetForNewYear = latestYear !== null && latestYear < currentYear
  const nextSeq = resetForNewYear ? 1 : best.pattern.seq + 1
  // Doklad vzniká dnes, takže rok v náhledu je letošní — ne ten z importu.
  const previewYear = latestYear === null ? null : currentYear

  return {
    prefix,
    format,
    nextSeq,
    preview: buildFromPattern(format, prefix, nextSeq, best.pattern.seqWidth, previewYear),
    basedOn: best.raw,
    year: latestYear,
    resetForNewYear,
  }
}

/**
 * Složí číslo ze vzoru. Vlastní varianta `buildInvoiceNumber` — ta doplňuje
 * pořadí vždy na čtyři místa, což by u zákazníka s třímístnou řadou tiše
 * změnilo tvar čísla. Náhled musí ukázat, co doopravdy vznikne.
 */
export function buildFromPattern(
  format: string,
  prefix: string,
  seq: number,
  seqWidth: number,
  year: number | null,
): string {
  return format
    .replace('{prefix}', prefix)
    .replace('{year}', String(year ?? new Date().getFullYear()))
    .replace('{seq}', String(seq).padStart(seqWidth, '0'))
}
