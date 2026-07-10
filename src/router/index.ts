import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isApiMode } from '@/lib/http'
import type { AppModuleId } from '@/lib/modules'

// Typování route meta (rozšíří se v dalších taskech — guards F0-35, SEO F2-31).
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    layout?: 'public' | 'app' | 'auth'
    /** Povolené role (jinak přesměrování na Přehled). Prázdné/nevyplněné = bez omezení. */
    requiresRole?: string[]
    /** Zapnutý runtime modul firmy. Nevyplněné = bez modulového omezení. */
    requiresModule?: AppModuleId
  }
}

// Skeleton: všechny routy zatím míří na sdílený PagePlaceholder.
// Reálné stránky doplní tasky F2 (web), F3 (auth), F4–F7 (app).
const PagePlaceholder = () => import('@/components/PagePlaceholder.vue')

const routes: RouteRecordRaw[] = [
  // --- Veřejné (PublicLayout) ---
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: 'Domů', layout: 'public' },
  },
  {
    path: '/uctenka',
    name: 'uctenka-demo',
    component: () => import('@/pages/UctenkaDemoPage.vue'),
    meta: { title: 'Účtenka — náhled', layout: 'public' },
  },
  {
    path: '/rezervace/:slug',
    name: 'public-rezervace',
    component: () => import('@/pages/PublicRezervacePage.vue'),
    meta: { title: 'Online rezervace', layout: 'public' },
  },
  {
    path: '/objednavka/:slug',
    name: 'public-objednavka',
    component: () => import('@/pages/PublicOrderPage.vue'),
    meta: { title: 'Online objednávka', layout: 'public' },
  },
  {
    path: '/klient/:token',
    name: 'public-klientska-zona',
    component: () => import('@/pages/KlientskaZonaPage.vue'),
    meta: { title: 'Klientská zóna', layout: 'public' },
  },
  {
    path: '/funkce',
    name: 'funkce',
    component: () => import('@/pages/FunkcePage.vue'),
    meta: { title: 'Funkce', layout: 'public' },
  },
  {
    path: '/cenik',
    name: 'cenik',
    component: () => import('@/pages/CenikPage.vue'),
    meta: { title: 'Ceník', layout: 'public' },
  },
  {
    path: '/faq',
    name: 'faq',
    component: () => import('@/pages/FaqPage.vue'),
    meta: { title: 'FAQ', layout: 'public' },
  },
  {
    path: '/srovnani',
    name: 'srovnani',
    component: () => import('@/pages/SrovnaniPage.vue'),
    meta: { title: 'Srovnání', layout: 'public' },
  },
  {
    path: '/akce',
    name: 'akce',
    component: () => import('@/pages/AkcePage.vue'),
    meta: { title: 'Akce', layout: 'public' },
  },
  {
    path: '/clanky',
    name: 'clanky',
    component: () => import('@/pages/ClankyPage.vue'),
    meta: { title: 'Články', layout: 'public' },
  },
  {
    path: '/clanky/:slug',
    name: 'clanek',
    component: () => import('@/pages/ClanekDetailPage.vue'),
    meta: { title: 'Článek', layout: 'public' },
  },
  {
    path: '/nase-sliby',
    name: 'nase-sliby',
    component: () => import('@/pages/NaseSlibyPage.vue'),
    meta: { title: 'Naše sliby', layout: 'public' },
  },
  {
    path: '/gdpr',
    name: 'gdpr',
    component: () => import('@/pages/GdprPage.vue'),
    meta: { title: 'GDPR', layout: 'public' },
  },
  {
    path: '/podminky',
    name: 'podminky',
    component: () => import('@/pages/PodminkyPage.vue'),
    meta: { title: 'Podmínky', layout: 'public' },
  },

  // --- Auth (AuthLayout — fullscreen, bez navbaru/footeru) ---
  {
    path: '/prihlaseni',
    name: 'prihlaseni',
    component: () => import('@/pages/PrihlaseniPage.vue'),
    meta: { title: 'Přihlášení', layout: 'auth' },
  },
  {
    path: '/registrace',
    name: 'registrace',
    component: () => import('@/pages/RegistracePage.vue'),
    meta: { title: 'Registrace', layout: 'auth' },
  },
  // Obnova hesla: routy /zapomenute-heslo a /reset-hesla dočasně vyřazeny — stránky byly stub bez backendu
  // (falešně hlásily odeslání e-mailu). Vrátit až s reálným reset flow (API endpointy + SMTP).

  // --- App (AppLayout, chráněné route guardem níže) ---
  {
    path: '/app',
    name: 'app',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { title: 'Přehled', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },
  {
    path: '/app/faktury',
    name: 'app-faktury',
    component: () => import('@/pages/FakturyPage.vue'),
    meta: { title: 'Faktury', layout: 'app', requiresAuth: true, requiresModule: 'invoicing' },
  },
  {
    path: '/app/faktury/editor',
    name: 'app-faktury-editor',
    component: () => import('@/pages/FakturyEditorPage.vue'),
    meta: {
      title: 'Editor faktury',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'invoicing',
    },
  },
  {
    path: '/app/konsolidace',
    name: 'app-konsolidace',
    component: () => import('@/pages/KonsolidacePage.vue'),
    meta: {
      title: 'Konsolidace poboček',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'reporting',
      requiresRole: ['Owner', 'Manager'],
    },
  },
  {
    path: '/app/provozni-prehled',
    name: 'app-provozni-prehled',
    component: () => import('@/pages/ProvozniPrehledPage.vue'),
    meta: {
      title: 'Provozní přehled',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'reporting',
      requiresRole: ['Owner', 'Admin', 'Manager'],
    },
  },
  {
    path: '/app/uzaverka',
    name: 'app-uzaverka',
    component: () => import('@/pages/UzaverkaPage.vue'),
    meta: {
      title: 'Uzávěrka',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'pos',
      requiresRole: ['Owner', 'Manager'],
    },
  },
  {
    path: '/app/cashflow',
    name: 'app-cashflow',
    component: () => import('@/pages/CashflowPage.vue'),
    meta: {
      title: 'Cashflow & upomínky',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'invoicing',
    },
  },
  {
    path: '/app/uctarna',
    name: 'app-uctarna',
    component: () => import('@/pages/UctarnaPage.vue'),
    meta: { title: 'Účtárna', layout: 'app', requiresAuth: true, requiresModule: 'invoicing' },
  },
  {
    path: '/app/dph',
    name: 'app-dph',
    component: () => import('@/pages/DphPage.vue'),
    meta: { title: 'Přehled DPH', layout: 'app', requiresAuth: true, requiresModule: 'invoicing' },
  },
  {
    path: '/app/vernost',
    name: 'app-vernost',
    component: () => import('@/pages/VernostPage.vue'),
    meta: {
      title: 'Věrnost & návraty',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'loyalty',
    },
  },
  {
    path: '/app/akce-ceny',
    name: 'app-akce-ceny',
    component: () => import('@/pages/AkceProvozuPage.vue'),
    meta: {
      title: 'Akce a ceny',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'loyalty',
    },
  },
  {
    path: '/app/zakazky',
    name: 'app-zakazky',
    component: () => import('@/pages/ZakazkyPage.vue'),
    meta: { title: 'Zakázky & výjezdy', layout: 'app', requiresAuth: true, requiresModule: 'jobs' },
  },
  {
    path: '/app/podpisy',
    name: 'app-podpisy',
    component: () => import('@/pages/PodpisyPage.vue'),
    meta: {
      title: 'Ověřené podpisy',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'verified_signing',
    },
  },
  {
    path: '/app/nabidky',
    name: 'app-nabidky',
    component: () => import('@/pages/NabidkyPage.vue'),
    meta: { title: 'Nabídky', layout: 'app', requiresAuth: true, requiresModule: 'invoicing' },
  },
  {
    path: '/app/klienti',
    name: 'app-klienti',
    component: () => import('@/pages/KlientiPage.vue'),
    // Klienti jsou fakturační entita — backend /clients gatuje modulem invoicing (Permissions.Invoices.Read →
    // ProductModules.Invoicing). Bez modulu backend vrací 403 a stránka ukazovala zavádějící „Server je momentálně
    // nedostupný" (stejný symptom jako #156). Route i nav proto patří pod invoicing, ne core.
    meta: { title: 'Klienti', layout: 'app', requiresAuth: true, requiresModule: 'invoicing' },
  },
  {
    path: '/app/import',
    name: 'app-import',
    component: () => import('@/pages/ImportPage.vue'),
    meta: {
      title: 'Import dat',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'integrations',
    },
  },
  {
    path: '/app/import/faktury',
    name: 'app-import-faktury',
    component: () => import('@/import/invoices/FakturoidInvoiceImport.vue'),
    meta: {
      title: 'Import faktur',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'invoicing',
    },
  },
  {
    path: '/app/pokladna',
    name: 'app-pokladna',
    component: () => import('@/pages/PokladnaPage.vue'),
    meta: { title: 'Pokladna', layout: 'app', requiresAuth: true, requiresModule: 'pos' },
  },
  {
    path: '/app/sklad',
    name: 'app-sklad',
    component: () => import('@/pages/SkladPage.vue'),
    meta: { title: 'Sklad', layout: 'app', requiresAuth: true, requiresModule: 'stock' },
  },
  {
    path: '/app/kategorie',
    name: 'app-kategorie',
    component: () => import('@/pages/KategoriePage.vue'),
    meta: { title: 'Kategorie', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },
  {
    path: '/app/modifikatory',
    name: 'app-modifikatory',
    component: () => import('@/pages/ModifikatoryPage.vue'),
    meta: { title: 'Modifikátory', layout: 'app', requiresAuth: true, requiresModule: 'stock' },
  },
  {
    path: '/app/zasoby',
    name: 'app-zasoby',
    component: () => import('@/pages/ZasobyPage.vue'),
    meta: { title: 'Zásoby', layout: 'app', requiresAuth: true, requiresModule: 'stock' },
  },
  {
    path: '/app/naskladneni',
    name: 'app-naskladneni',
    component: () => import('@/pages/NaskladneniPage.vue'),
    meta: { title: 'Naskladnění', layout: 'app', requiresAuth: true, requiresModule: 'stock' },
  },
  {
    path: '/app/dochazka',
    name: 'app-dochazka',
    component: () => import('@/pages/DochazkaPage.vue'),
    meta: { title: 'Docházka', layout: 'app', requiresAuth: true, requiresModule: 'attendance' },
  },
  {
    path: '/app/smeny',
    name: 'app-smeny',
    component: () => import('@/pages/SmenyPage.vue'),
    meta: {
      title: 'Plán směn',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'attendance',
      // Plánovač je manažerský nástroj (plán/publikace/mzdové podklady). Obsluha/účetní sem nesmí
      // — jinak by přes plánovaný náklad a per-směna sazby unikly mzdově citlivé údaje.
      requiresRole: ['Owner', 'Admin', 'Manager'],
    },
  },
  {
    path: '/app/pobocky',
    name: 'app-pobocky',
    component: () => import('@/pages/PobockyPage.vue'),
    meta: {
      title: 'Pobočky & vedení',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'core',
      requiresRole: ['Owner', 'Manager'],
    },
  },
  {
    path: '/app/audit',
    name: 'app-audit',
    component: () => import('@/pages/AuditPage.vue'),
    meta: {
      title: 'Audit',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'core',
      requiresRole: ['Owner', 'Admin'],
    },
  },
  {
    path: '/app/schvalovani',
    name: 'app-schvalovani',
    component: () => import('@/pages/SchvalovaniPage.vue'),
    meta: {
      title: 'Schvalování',
      layout: 'app',
      requiresAuth: true,
      requiresModule: 'core',
      requiresRole: ['Owner', 'Admin', 'Manager'],
    },
  },
  {
    path: '/app/rezervace',
    name: 'app-rezervace',
    component: () => import('@/pages/RezervacePage.vue'),
    meta: { title: 'Rezervace', layout: 'app', requiresAuth: true, requiresModule: 'booking' },
  },
  {
    path: '/app/restaurace',
    name: 'app-restaurace',
    component: () => import('@/pages/RestauracePage.vue'),
    meta: { title: 'Restaurace', layout: 'app', requiresAuth: true, requiresModule: 'gastro' },
  },
  {
    path: '/app/kuchyne',
    name: 'app-kuchyne',
    component: () => import('@/pages/KuchynePage.vue'),
    meta: { title: 'Kuchyně', layout: 'app', requiresAuth: true, requiresModule: 'gastro' },
  },
  {
    path: '/app/mapa-stolu',
    name: 'app-mapa-stolu',
    component: () => import('@/pages/MapaStoluPage.vue'),
    meta: { title: 'Mapa stolů', layout: 'app', requiresAuth: true, requiresModule: 'gastro' },
  },
  {
    path: '/app/nastaveni',
    name: 'app-nastaveni',
    component: () => import('@/pages/NastaveniPage.vue'),
    meta: { title: 'Nastavení', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },
  {
    path: '/app/onboarding',
    name: 'app-onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { title: 'Onboarding', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },
  {
    path: '/app/predplatne',
    name: 'app-predplatne',
    component: () => import('@/pages/PredplatnePage.vue'),
    meta: { title: 'Předplatné', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },
  {
    path: '/app/predplatne/dekujeme',
    name: 'app-predplatne-dekujeme',
    component: () => import('@/pages/PredplatneDekujemePage.vue'),
    meta: { title: 'Děkujeme', layout: 'app', requiresAuth: true, requiresModule: 'core' },
  },

  // --- 404 ---
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: PagePlaceholder,
    meta: { title: 'Stránka nenalezena', layout: 'public' },
  },
]

// Dev-only přehled UI primitiv (F1-14). V produkčním buildu se route nepřidá.
if (import.meta.env.DEV) {
  routes.splice(routes.length - 1, 0, {
    path: '/ui-kit',
    name: 'ui-kit',
    component: () => import('@/pages/UiKit.vue'),
    meta: { title: 'UI Kit', layout: 'public' },
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// Route guard (mock auth): chrání /app routy a odklání přihlášené pryč z auth stránek.
router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.init()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'prihlaseni', query: { redirect: to.fullPath } }
  }
  if (auth.isAuthenticated && (to.name === 'prihlaseni' || to.name === 'registrace')) {
    return { name: 'app' }
  }
  // API režim: přihlášený uživatel bez firmy musí nejdřív projít onboardingem (jinak tenant-scoped
  // endpointy vrací „nemá firmu"). Mock režim firmu nevyžaduje.
  if (
    isApiMode() &&
    to.meta.requiresAuth &&
    auth.isAuthenticated &&
    !auth.companyId &&
    to.name !== 'app-onboarding'
  ) {
    return { name: 'app-onboarding' }
  }
  // Role gating: routa vyhrazená rolím (manažerské stránky) → nedostatečná role zpět na Přehled.
  // hasRole je fail-open (mock / neznámá role neblokuje); skutečné vynucení je na backendu.
  if (to.meta.requiresRole && auth.isAuthenticated && !auth.hasRole(...to.meta.requiresRole)) {
    return { name: 'app' }
  }
  // Modulový UX gate: tenant vidí jen zapnuté moduly. API enforcement přijde navazujícím krokem.
  if (to.meta.requiresModule && auth.isAuthenticated && !auth.hasModule(to.meta.requiresModule)) {
    return { name: 'app' }
  }
  // Employee nemá invoices.read → přehled (dashboard) by vracel 403; přistane rovnou na pokladně.
  if (isApiMode() && to.name === 'app' && auth.role === 'Employee') {
    return { path: '/app/pokladna' }
  }
  return true
})

export default router
