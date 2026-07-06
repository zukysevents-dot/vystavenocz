/**
 * Obchodní CTA veřejného webu před spuštěním aplikace.
 * Login/registrace se z veřejného webu nepropaguje — všechna CTA vedou na e-mail
 * (demo, early access, zájem o modul). Jediný zdroj adresy a předvyplněných zpráv.
 */

export const CONTACT_EMAIL = 'patrik@vystaveno.cz'

function mailto(subject: string, body?: string): string {
  const query = [`subject=${encodeURIComponent(subject)}`]
  if (body) query.push(`body=${encodeURIComponent(body)}`)
  return `mailto:${CONTACT_EMAIL}?${query.join('&')}`
}

/** Primární CTA: osobní ukázka systému. */
export const DEMO_MAILTO = mailto(
  'Chci demo Vystaveno',
  'Dobrý den,\n\nmám zájem o ukázku systému Vystaveno.\n\nMůj provoz (např. restaurace, kavárna, salon, řemeslo, obchod):\nTelefon (nepovinné):\n',
)

/** Sekundární CTA: zápis mezi první zákazníky. */
export const EARLY_ACCESS_MAILTO = mailto(
  'Zápis do early accessu Vystaveno',
  'Dobrý den,\n\nchci se zapsat do early accessu Vystaveno.\n\nMůj provoz:\nTelefon (nepovinné):\n',
)

/** Zájem o konkrétní modul či nástavbu z ceníku. */
export function moduleInterestMailto(moduleName: string): string {
  return mailto(`Mám zájem o modul ${moduleName}`)
}

/** Zájem o sestavu poskládanou v ceníkovém konfigurátoru. */
export function pricingSelectionMailto(moduleNames: readonly string[], perMonth: number): string {
  return mailto(
    'Early access — mám zájem o sestavu Vystaveno',
    `Dobrý den,\n\nv ceníku jsem si poskládal(a) sestavu:\n${moduleNames
      .map((n) => `- ${n}`)
      .join(
        '\n',
      )}\n\nOrientační cena: ${perMonth.toLocaleString('cs-CZ')} Kč/měs.\n\nMůj provoz:\nTelefon (nepovinné):\n`,
  )
}
