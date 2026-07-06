import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('app routes — role gates', () => {
  it('registers public order route without auth', () => {
    const route = router.getRoutes().find((r) => r.name === 'public-objednavka')

    expect(route?.path).toBe('/objednavka/:slug')
    expect(route?.meta.layout).toBe('public')
    expect(route?.meta.requiresAuth).toBeUndefined()
  })

  it('allows Admin to open Provozní přehled route like the backend pos.reports permission', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-provozni-prehled')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin', 'Manager'])
    expect(route?.meta.requiresModule).toBe('reporting')
  })

  it('keeps Audit route aligned with backend company.manage permission', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-audit')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin'])
    expect(route?.meta.requiresModule).toBe('core')
  })
})
