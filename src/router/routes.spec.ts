import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('app routes — role gates', () => {
  it('allows Admin to open Provozní přehled route like the backend pos.reports permission', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-provozni-prehled')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin', 'Manager'])
    expect(route?.meta.requiresModule).toBe('reporting')
  })
})
