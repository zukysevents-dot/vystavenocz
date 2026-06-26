import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Typování route meta (rozšíří se v dalších taskech — guards F0-35, SEO F2-31).
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    layout?: 'public' | 'app' | 'auth'
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
  {
    path: '/zapomenute-heslo',
    name: 'zapomenute-heslo',
    component: () => import('@/pages/ZapomenuteHesloPage.vue'),
    meta: { title: 'Zapomenuté heslo', layout: 'auth' },
  },
  {
    path: '/reset-hesla',
    name: 'reset-hesla',
    component: () => import('@/pages/ResetHeslaPage.vue'),
    meta: { title: 'Reset hesla', layout: 'auth' },
  },

  // --- App (AppLayout, chráněné route guardem níže) ---
  {
    path: '/app',
    name: 'app',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { title: 'Přehled', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/faktury',
    name: 'app-faktury',
    component: () => import('@/pages/FakturyPage.vue'),
    meta: { title: 'Faktury', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/faktury/editor',
    name: 'app-faktury-editor',
    component: () => import('@/pages/FakturyEditorPage.vue'),
    meta: { title: 'Editor faktury', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/klienti',
    name: 'app-klienti',
    component: () => import('@/pages/KlientiPage.vue'),
    meta: { title: 'Klienti', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/pokladna',
    name: 'app-pokladna',
    component: () => import('@/pages/PokladnaPage.vue'),
    meta: { title: 'Pokladna', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/sklad',
    name: 'app-sklad',
    component: () => import('@/pages/SkladPage.vue'),
    meta: { title: 'Sklad', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/kategorie',
    name: 'app-kategorie',
    component: () => import('@/pages/KategoriePage.vue'),
    meta: { title: 'Kategorie', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/zasoby',
    name: 'app-zasoby',
    component: () => import('@/pages/ZasobyPage.vue'),
    meta: { title: 'Zásoby', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/dochazka',
    name: 'app-dochazka',
    component: () => import('@/pages/DochazkaPage.vue'),
    meta: { title: 'Docházka', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/restaurace',
    name: 'app-restaurace',
    component: () => import('@/pages/RestauracePage.vue'),
    meta: { title: 'Restaurace', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/kuchyne',
    name: 'app-kuchyne',
    component: () => import('@/pages/KuchynePage.vue'),
    meta: { title: 'Kuchyně', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/mapa-stolu',
    name: 'app-mapa-stolu',
    component: () => import('@/pages/MapaStoluPage.vue'),
    meta: { title: 'Mapa stolů', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/nastaveni',
    name: 'app-nastaveni',
    component: () => import('@/pages/NastaveniPage.vue'),
    meta: { title: 'Nastavení', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/onboarding',
    name: 'app-onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { title: 'Onboarding', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/predplatne',
    name: 'app-predplatne',
    component: () => import('@/pages/PredplatnePage.vue'),
    meta: { title: 'Předplatné', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/predplatne/dekujeme',
    name: 'app-predplatne-dekujeme',
    component: () => import('@/pages/PredplatneDekujemePage.vue'),
    meta: { title: 'Děkujeme', layout: 'app', requiresAuth: true },
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
  return true
})

export default router
