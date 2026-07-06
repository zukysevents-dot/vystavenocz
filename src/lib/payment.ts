// Pomocné výpočty pro tok placení (PaymentDialog) — čistá logika bez UI kvůli testovatelnosti.

const round2 = (n: number) => Math.round(n * 100) / 100

/** Kolik vrátit: přijatá hotovost minus částka k úhradě (záporné = nedoplaceno). */
export function cashChange(total: number, received: number): number {
  return round2(received - total)
}

/**
 * Rychlé volby přijaté hotovosti: „přesná" částka zaokrouhlená NAHORU na celé Kč
 * (hotovost pod korunu nejde fyzicky dát a celé Kč navíc kryjí případný haléřový
 * rozdíl FE náhledu vs. server Total) + zaokrouhlení na obvyklé bankovky
 * (100/500/1000/2000 Kč). Bez duplicit, max 4 volby.
 */
export function suggestedCashAmounts(total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return []
  const exact = Math.ceil(round2(total))
  const ceilTo = (step: number) => Math.ceil(exact / step) * step
  const candidates = [exact, ceilTo(100), ceilTo(500), ceilTo(1000), ceilTo(2000)]
  const unique: number[] = []
  for (const amount of candidates) {
    if (!unique.includes(amount)) unique.push(amount)
    if (unique.length === 4) break
  }
  return unique
}
