import type { ClientInput } from '@/composables/useClients'
import type { AresResult } from '@/composables/useAres'

/**
 * Sloučí data z ARES do klienta — vyplní jen pole, která jsou prázdná
 * (existující hodnoty z importu mají přednost). Vrací jen změněná pole.
 */
export function mergeAres(value: Partial<ClientInput>, r: AresResult): Partial<ClientInput> {
  const patch: Partial<ClientInput> = {}
  if (!value.name?.trim() && r.companyName) patch.name = r.companyName
  if (!value.dic && r.dic) patch.dic = r.dic
  if (!value.street && r.street) patch.street = r.street
  if (!value.city && r.city) patch.city = r.city
  if (!value.zip && r.zip) patch.zip = r.zip
  return patch
}
