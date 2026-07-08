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
    description:
      'Backend drží životní cyklus terminálové platby; výsledek zatím potvrzuje obsluha.',
    operatorAction: 'Založené platby a jejich stavy sledovat v integracích, kartu potvrdit ručně.',
    nextStep: 'Přidat reálného poskytovatele terminálu bez změny checkoutu.',
    requiresConnector: true,
  },
  {
    id: 'receipt-and-kitchen-printing',
    name: 'Účtenky a kuchyňské bony',
    capability: 'printing',
    state: 'manual',
    description: 'Backend má frontu tiskových jobů a tokenový kontrakt pro lokálního agenta.',
    operatorAction:
      'Zaregistrovat tiskového agenta v nastavení a token vložit do lokálního programu.',
    nextStep: 'Dodat desktopového agenta pro ESC/POS nebo síťové tiskárny.',
    requiresConnector: true,
  },
  {
    id: 'pohoda-flexi-export',
    name: 'POHODA / Money',
    capability: 'accounting',
    state: 'export',
    description: 'Generic CSV a POHODA XML export běží; Money/SuperFaktura čekají na renderer.',
    operatorAction: 'Stáhnout Generic CSV nebo POHODA XML a importovat soubor v účetnictví.',
    nextStep: 'Doplnit další cílové adaptéry nebo přímý účetní konektor.',
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
