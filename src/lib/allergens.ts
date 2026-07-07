export interface AllergenInfo {
  code: number
  label: string
}

export const ALLERGENS: AllergenInfo[] = [
  { code: 1, label: 'Lepek' },
  { code: 2, label: 'Korýši' },
  { code: 3, label: 'Vejce' },
  { code: 4, label: 'Ryby' },
  { code: 5, label: 'Arašídy' },
  { code: 6, label: 'Sója' },
  { code: 7, label: 'Mléko' },
  { code: 8, label: 'Skořápkové plody' },
  { code: 9, label: 'Celer' },
  { code: 10, label: 'Hořčice' },
  { code: 11, label: 'Sezam' },
  { code: 12, label: 'Siřičitany' },
  { code: 13, label: 'Vlčí bob' },
  { code: 14, label: 'Měkkýši' },
]

export function normalizeAllergens(codes: readonly number[] | null | undefined): number[] {
  return [...new Set(codes ?? [])]
    .filter((code) => Number.isInteger(code) && code >= 1 && code <= 14)
    .sort((a, b) => a - b)
}

export function formatAllergenCodes(codes: readonly number[] | null | undefined): string {
  return normalizeAllergens(codes).join(', ')
}

export function formatAllergens(codes: readonly number[] | null | undefined): string {
  const labels = new Map(ALLERGENS.map((allergen) => [allergen.code, allergen.label]))
  return normalizeAllergens(codes)
    .map((code) => `${code} ${labels.get(code) ?? ''}`.trim())
    .join(', ')
}
