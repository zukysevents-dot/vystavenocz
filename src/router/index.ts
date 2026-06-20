import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Typování route meta (rozšíří se v dalších taskech — guards F0-35, SEO F2-31).
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    layout?: 'public' | 'app'
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
    component: PagePlaceholder,
    meta: { title: 'Ceník', layout: 'public' },
  },
  {
    path: '/faq',
    name: 'faq',
    component: PagePlaceholder,
    meta: { title: 'FAQ', layout: 'public' },
  },
  {
    path: '/srovnani',
    name: 'srovnani',
    component: PagePlaceholder,
    meta: { title: 'Srovnání', layout: 'public' },
  },
  {
    path: '/akce',
    name: 'akce',
    component: PagePlaceholder,
    meta: { title: 'Akce', layout: 'public' },
  },
  {
    path: '/clanky',
    name: 'clanky',
    component: PagePlaceholder,
    meta: { title: 'Články', layout: 'public' },
  },
  {
    path: '/clanky/:slug',
    name: 'clanek',
    component: PagePlaceholder,
    meta: { title: 'Článek', layout: 'public' },
  },
  {
    path: '/nase-sliby',
    name: 'nase-sliby',
    component: PagePlaceholder,
    meta: { title: 'Naše sliby', layout: 'public' },
  },
  {
    path: '/gdpr',
    name: 'gdpr',
    component: PagePlaceholder,
    meta: { title: 'GDPR', layout: 'public' },
  },
  {
    path: '/podminky',
    name: 'podminky',
    component: PagePlaceholder,
    meta: { title: 'Podmínky', layout: 'public' },
  },

  // --- Auth (PublicLayout) ---
  {
    path: '/prihlaseni',
    name: 'prihlaseni',
    component: PagePlaceholder,
    meta: { title: 'Přihlášení', layout: 'public' },
  },
  {
    path: '/registrace',
    name: 'registrace',
    component: PagePlaceholder,
    meta: { title: 'Registrace', layout: 'public' },
  },
  {
    path: '/zapomenute-heslo',
    name: 'zapomenute-heslo',
    component: PagePlaceholder,
    meta: { title: 'Zapomenuté heslo', layout: 'public' },
  },
  {
    path: '/reset-hesla',
    name: 'reset-hesla',
    component: PagePlaceholder,
    meta: { title: 'Reset hesla', layout: 'public' },
  },

  // --- App (AppLayout, chráněné — guard přijde v F0-35) ---
  {
    path: '/app',
    name: 'app',
    component: PagePlaceholder,
    meta: { title: 'Přehled', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/faktury',
    name: 'app-faktury',
    component: PagePlaceholder,
    meta: { title: 'Faktury', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/faktury/editor',
    name: 'app-faktury-editor',
    component: PagePlaceholder,
    meta: { title: 'Editor faktury', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/klienti',
    name: 'app-klienti',
    component: PagePlaceholder,
    meta: { title: 'Klienti', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/nastaveni',
    name: 'app-nastaveni',
    component: PagePlaceholder,
    meta: { title: 'Nastavení', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/onboarding',
    name: 'app-onboarding',
    component: PagePlaceholder,
    meta: { title: 'Onboarding', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/predplatne',
    name: 'app-predplatne',
    component: PagePlaceholder,
    meta: { title: 'Předplatné', layout: 'app', requiresAuth: true },
  },
  {
    path: '/app/predplatne/dekujeme',
    name: 'app-predplatne-dekujeme',
    component: PagePlaceholder,
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

export default router
