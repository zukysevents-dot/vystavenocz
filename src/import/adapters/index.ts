import type { ImportEntity, ImportSourceAdapter } from '../types'
import { genericClients } from './generic-clients'

/** Registr všech importních adaptérů. Nový zdroj = přidat sem jeden řádek. */
export const ADAPTERS: ImportSourceAdapter<unknown>[] = [genericClients]

export function adaptersFor(entity: ImportEntity): ImportSourceAdapter<unknown>[] {
  return ADAPTERS.filter((a) => a.entity === entity)
}

/** Zkusí rozpoznat zdroj podle hlaviček souboru (vrací první sedící adaptér). */
export function detectAdapter(
  headers: string[],
  entity: ImportEntity,
): ImportSourceAdapter<unknown> | undefined {
  return adaptersFor(entity).find((a) => a.detect?.(headers))
}
