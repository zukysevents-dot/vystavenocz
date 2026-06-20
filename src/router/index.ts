import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Typování route meta (rozšíří se v dalších taskech — guards F0-35, SEO F2-31).
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
  }
}

// Skeleton: všechny routy zatím míří na sdílený PagePlaceholder.
// Reálné stránky doplní tasky F2 (web), F3 (auth), F4–F7 (app).
const PagePlaceholder = () => import('@/components/PagePlaceholder.vue')

const routes: RouteRecordRaw[] = [
  // --- Veřejné ---
  { path: '/', name: 'home', component: PagePlaceholder, meta: { title: 'Domů' } },
  { path: '/funkce', name: 'funkce', component: PagePlaceholder, meta: { title: 'Funkce' } },
  { path: '/cenik', name: 'cenik', component: PagePlaceholder, meta: { title: 'Ceník' } },
  { path: '/faq', name: 'faq', component: PagePlaceholder, meta: { title: 'FAQ' } },
  { path: '/srovnani', name: 'srovnani', component: PagePlaceholder, meta: { title: 'Srovnání' } },
  { path: '/akce', name: 'akce', component: PagePlaceholder, meta: { title: 'Akce' } },
  { path: '/clanky', name: 'clanky', component: PagePlaceholder, meta: { title: 'Články' } },
  {
    path: '/clanky/:slug',
    name: 'clanek',
    component: PagePlaceholder,
    meta: { title: 'Článek' },
  },
  {
    path: '/nase-sliby',
    name: 'nase-sliby',
    component: PagePlaceholder,
    meta: { title: 'Naše sliby' },
  },
  { path: '/gdpr', name: 'gdpr', component: PagePlaceholder, meta: { title: 'GDPR' } },
  { path: '/podminky', name: 'podminky', component: PagePlaceholder, meta: { title: 'Podmínky' } },

  // --- Auth ---
  {
    path: '/prihlaseni',
    name: 'prihlaseni',
    component: PagePlaceholder,
    meta: { title: 'Přihlášení' },
  },
  {
    path: '/registrace',
    name: 'registrace',
    component: PagePlaceholder,
    meta: { title: 'Registrace' },
  },
  {
    path: '/zapomenute-heslo',
    name: 'zapomenute-heslo',
    component: PagePlaceholder,
    meta: { title: 'Zapomenuté heslo' },
  },
  {
    path: '/reset-hesla',
    name: 'reset-hesla',
    component: PagePlaceholder,
    meta: { title: 'Reset hesla' },
  },

  // --- App (chráněné, guard přijde v F0-35) ---
  {
    path: '/app',
    name: 'app',
    component: PagePlaceholder,
    meta: { title: 'Přehled', requiresAuth: true },
  },
  {
    path: '/app/faktury',
    name: 'app-faktury',
    component: PagePlaceholder,
    meta: { title: 'Faktury', requiresAuth: true },
  },
  {
    path: '/app/faktury/editor',
    name: 'app-faktury-editor',
    component: PagePlaceholder,
    meta: { title: 'Editor faktury', requiresAuth: true },
  },
  {
    path: '/app/klienti',
    name: 'app-klienti',
    component: PagePlaceholder,
    meta: { title: 'Klienti', requiresAuth: true },
  },
  {
    path: '/app/nastaveni',
    name: 'app-nastaveni',
    component: PagePlaceholder,
    meta: { title: 'Nastavení', requiresAuth: true },
  },
  {
    path: '/app/onboarding',
    name: 'app-onboarding',
    component: PagePlaceholder,
    meta: { title: 'Onboarding', requiresAuth: true },
  },
  {
    path: '/app/predplatne',
    name: 'app-predplatne',
    component: PagePlaceholder,
    meta: { title: 'Předplatné', requiresAuth: true },
  },
  {
    path: '/app/predplatne/dekujeme',
    name: 'app-predplatne-dekujeme',
    component: PagePlaceholder,
    meta: { title: 'Děkujeme', requiresAuth: true },
  },

  // --- 404 ---
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: PagePlaceholder,
    meta: { title: 'Stránka nenalezena' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
