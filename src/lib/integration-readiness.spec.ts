import { describe, expect, it } from 'vitest'
import {
  INTEGRATION_READINESS_ITEMS,
  integrationBadgeVariant,
  integrationStateLabel,
  summarizeIntegrationReadiness,
} from './integration-readiness'

describe('integration readiness', () => {
  it('counts current integration states and connector backlog', () => {
    expect(summarizeIntegrationReadiness(INTEGRATION_READINESS_ITEMS)).toEqual({
      ready: 2,
      manual: 2,
      export: 1,
      planned: 1,
      connectorBacklog: 4,
      operationallyUsable: 5,
    })
  })

  it('uses clear Czech labels for operational status', () => {
    expect(integrationStateLabel('ready')).toBe('Připraveno')
    expect(integrationStateLabel('manual')).toBe('Manuální krok')
    expect(integrationStateLabel('export')).toBe('Exportní režim')
    expect(integrationStateLabel('planned')).toBe('Plánováno')
  })

  it('keeps non-ready connector statuses visually secondary or outlined', () => {
    expect(integrationBadgeVariant('ready')).toBe('default')
    expect(integrationBadgeVariant('manual')).toBe('secondary')
    expect(integrationBadgeVariant('export')).toBe('outline')
    expect(integrationBadgeVariant('planned')).toBe('outline')
  })
})
