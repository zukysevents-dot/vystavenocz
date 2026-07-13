import { describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type { AppModuleId } from '@/lib/modules'

// Guard-landing testy potřebují API režim — Employee redirect z /app je `isApiMode()`-only.
vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return { ...actual, isApiMode: () => true }
})

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

  it('allows Owner, Admin and Manager to open Denní uzávěrka', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-uzaverka')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin', 'Manager'])
    expect(route?.meta.requiresModule).toBe('pos')
  })

  it('allows only Owner and Admin to manage branches', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-pobocky')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin'])
    expect(route?.meta.requiresModule).toBe('core')
  })

  it('keeps Audit route aligned with backend company.manage permission', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-audit')

    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin'])
    expect(route?.meta.requiresModule).toBe('core')
  })

  it('gates verified signing behind its own add-on module', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-podpisy')

    expect(route?.path).toBe('/app/podpisy')
    expect(route?.meta.requiresModule).toBe('verified_signing')
    expect(route?.meta.requiresAuth).toBe(true)
  })

  it('gates the shift planner behind manager roles (wage privacy) within the attendance module', () => {
    const route = router.getRoutes().find((r) => r.name === 'app-smeny')

    // Obsluha/účetní nesmí do plánovače — jinak by přes plánovaný náklad a per-směna sazby
    // unikly mzdově citlivé údaje. Docházka (píchačka) je pro ně dál dostupná zvlášť.
    expect(route?.meta.requiresRole).toEqual(['Owner', 'Admin', 'Manager'])
    expect(route?.meta.requiresModule).toBe('attendance')
  })
})

describe('guard: Employee landing podle modulů (bez redirect smyčky)', () => {
  function setupEmployee(modules: AppModuleId[]) {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.user = { id: 'u1', email: 'tech@x.cz', fullName: 'Technik' }
    auth.companyId = 'c1'
    auth.role = 'Employee'
    auth.modules = modules
    auth.initialized = true // guard nezavolá init() → náš stav zůstane
  }

  it('crafts tenant (jobs bez pos) → /app/zakazky, ne smyčka na /app/pokladna', async () => {
    setupEmployee(['core', 'jobs'])
    await router.push('/app')
    expect(router.currentRoute.value.path).toBe('/app/zakazky')
  })

  it('pos tenant → /app/pokladna (zachované chování)', async () => {
    setupEmployee(['core', 'pos'])
    await router.push('/app')
    expect(router.currentRoute.value.path).toBe('/app/pokladna')
  })

  it('bez pos i jobs → /app/nastaveni (žádný modulový gate ho neodmítne)', async () => {
    setupEmployee(['core'])
    await router.push('/app')
    expect(router.currentRoute.value.path).toBe('/app/nastaveni')
  })
})
