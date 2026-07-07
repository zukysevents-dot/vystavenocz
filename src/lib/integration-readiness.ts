export type IntegrationReadinessState = 'ready' | 'manual' | 'export' | 'planned'
export type IntegrationCapability = 'accounting' | 'gastro' | 'payments' | 'printing' | 'api'

export interface IntegrationReadinessItem {
  id: string
  name: string
  capability: IntegrationCapability
  state: IntegrationReadinessState
  description: string
  operatorAction: string
  nextStep: string
  requiresConnector: boolean
}

export interface IntegrationReadinessSummary {
  ready: number
  manual: number
  export: number
  planned: number
  connectorBacklog: number
  operationallyUsable: number
}

export const INTEGRATION_READINESS_ITEMS: IntegrationReadinessItem[] = [
  {
    id: 'invoice-accounting-export',
    name: 'Faktury do účetnictví',
    capability: 'accounting',
    state: 'ready',
    description: 'Účtárna umí exportovat faktury jako ISDOC XML a přehledové CSV.',
    operatorAction: 'Stáhnout export a předat účetní nebo importovat ručně.',
    nextStep: 'Automatické odesílání do účetního systému.',
    requiresConnector: false,
  },
  {
    id: 'day-close-z-report',
    name: 'Gastro Z-reporty',
    capability: 'gastro',
    state: 'ready',
    description: 'Uzávěrka nabízí denní i měsíční účetní CSV a měsíční souhrn Z-reportů.',
    operatorAction: 'Po zavření dne stáhnout denní nebo měsíční export.',
    nextStep: 'Mapování na konkrétní importní šablony účetních programů.',
    requiresConnector: false,
  },
  {
    id: 'payment-terminal',
    name: 'Platební terminál',
    capability: 'payments',
    state: 'manual',
    description: 'Karta se potvrzuje po dokončení platby na fyzickém terminálu.',
    operatorAction: 'Zadat částku na terminálu a v systému potvrdit až úspěšnou platbu.',
    nextStep: 'Napojení terminálu nahradí ruční potvrzení bez změny platebního toku.',
    requiresConnector: true,
  },
  {
    id: 'receipt-and-kitchen-printing',
    name: 'Účtenky a kuchyňské bony',
    capability: 'printing',
    state: 'manual',
    description: 'Účtenky a bony jsou v systému připravené k tisku z prohlížeče.',
    operatorAction: 'Tisknout přes systémový dialog prohlížeče na nastavenou tiskárnu.',
    nextStep: 'Doplnit přímé ESC/POS nebo síťové tiskárny bez dialogu prohlížeče.',
    requiresConnector: true,
  },
  {
    id: 'pohoda-flexi-export',
    name: 'POHODA / Flexi',
    capability: 'accounting',
    state: 'export',
    description: 'Podklady se předávají přes ISDOC/CSV; přímá synchronizace zatím neběží.',
    operatorAction: 'Použít exportní soubory a importovat je v účetním systému.',
    nextStep: 'Doplnit konektory po potvrzení konkrétního importního kontraktu.',
    requiresConnector: true,
  },
  {
    id: 'partner-api',
    name: 'Partnerské API',
    capability: 'api',
    state: 'planned',
    description: 'Externí integrace zatím nejsou otevřené přes veřejné API.',
    operatorAction: 'Provoz běží bez externí automatizace.',
    nextStep: 'Navrhnout API klíče, webhooks a audit napojení pro partnery.',
    requiresConnector: true,
  },
]

export function integrationStateLabel(state: IntegrationReadinessState): string {
  const labels: Record<IntegrationReadinessState, string> = {
    ready: 'Připraveno',
    manual: 'Manuální krok',
    export: 'Exportní režim',
    planned: 'Plánováno',
  }
  return labels[state]
}

export function integrationBadgeVariant(
  state: IntegrationReadinessState,
): 'default' | 'secondary' | 'outline' {
  if (state === 'ready') return 'default'
  if (state === 'manual') return 'secondary'
  return 'outline'
}

export function summarizeIntegrationReadiness(
  items: readonly IntegrationReadinessItem[],
): IntegrationReadinessSummary {
  const summary: IntegrationReadinessSummary = {
    ready: 0,
    manual: 0,
    export: 0,
    planned: 0,
    connectorBacklog: 0,
    operationallyUsable: 0,
  }

  for (const item of items) {
    summary[item.state] += 1
    if (item.requiresConnector) summary.connectorBacklog += 1
    if (item.state !== 'planned') summary.operationallyUsable += 1
  }

  return summary
}
