import { describe, expect, it } from 'vitest'
import router from '@/router'
import { APP_MODULES, APP_NAV_DEFINITIONS, type AppModuleId } from '@/lib/modules'

/**
 * Kontrakt modulů sdílený backendem, webem a mobilem. Je to ZÁMĚRNĚ ručně psaný seznam: když ho
 * někdo změní na jedné platformě, tenhle test spadne a donutí ho projít i zbylé dvě
 * (`npm run audit:modules` porovná skutečné soubory všech tří repozitářů).
 *
 * Zdroj pravdy: `ProductModules.cs` v backendu. Dokumentace: docs/product/module-access-matrix.md.
 */
const MODULE_CONTRACT: AppModuleId[] = [
  'core',
  'invoicing',
  'pos',
  'gastro',
  'stock',
  'attendance',
  'booking',
  'jobs',
  'reporting',
  'loyalty',
  'ai',
  'integrations',
  'verified_signing',
  'crm',
]

describe('module parity contract', () => {
  it('web module catalog matches the shared backend contract', () => {
    expect([...APP_MODULES]).toEqual(MODULE_CONTRACT)
  })

  it('every app route is gated by a module the contract knows', () => {
    const ungated = router
      .getRoutes()
      .filter((route) => route.meta.requiresAuth && route.path.startsWith('/app'))
      // Rozcestník nedostupného modulu musí zůstat otevřený — právě on ten modul vysvětluje.
      .filter((route) => route.name !== 'app-modul-nedostupny')
      .filter((route) => !route.meta.requiresModule)
      .map((route) => route.path)

    expect(ungated).toEqual([])
  })

  it('route modules and navigation modules stay inside the contract', () => {
    const routeModules = router
      .getRoutes()
      .map((route) => route.meta.requiresModule)
      .filter((module): module is AppModuleId => Boolean(module))

    for (const module of [...routeModules, ...APP_NAV_DEFINITIONS.map((item) => item.module)]) {
      expect(MODULE_CONTRACT).toContain(module)
    }
  })

  it('every navigation item points at a registered route with the same module gate', () => {
    // Menu smí modul jen SCHOVAT — pravdu o přístupu drží route guard (a nad ním server).
    // Kdyby položka menu měla jiný modul než její routa, jedna z platforem by se rozešla s druhou.
    const mismatched = APP_NAV_DEFINITIONS.map((item) => {
      const route = router.getRoutes().find((r) => r.path === item.to)
      if (!route) return `${item.to} — routa neexistuje`
      if (route.meta.requiresModule !== item.module) {
        return `${item.to} — menu ${item.module} vs. routa ${String(route.meta.requiresModule)}`
      }
      return null
    }).filter(Boolean)

    expect(mismatched).toEqual([])
  })
})
