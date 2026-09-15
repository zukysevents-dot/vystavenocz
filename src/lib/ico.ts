// IČO — normalizace a kontrolní číslice (mod-11, váhy 8..2). Stejný algoritmus má backend
// (`CzechValidation`), tady běží jen proto, aby formulář řekl „tohle IČO neexistuje" hned při psaní
// a neplýtval dotazem do ARES na zjevný překlep. Rozhodující je vždycky odpověď serveru.

/** Očistí zápis na číslice a doplní vedoucí nuly na 8 míst; `null` = tvar, který IČO být nemůže. */
export function normalizeIco(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length < 1 || digits.length > 8) return null
  return digits.padStart(8, '0')
}

/** Platné IČO = 8 číslic se sedící kontrolní číslicí (odmítne „1234567" i „0000000"). */
export function isValidIco(raw: string | null | undefined): boolean {
  const ico = normalizeIco(raw)
  if (!ico) return false
  let sum = 0
  for (let i = 0; i < 7; i++) sum += Number(ico[i]) * (8 - i)
  const remainder = sum % 11
  const check = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder
  return check === Number(ico[7])
}
