<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  CreditCard,
  ShoppingCart,
  Package,
  Boxes,
  ScanBarcode,
  Tags,
  LayoutGrid,
  UtensilsCrossed,
  ChefHat,
  Clock,
  CalendarDays,
  CalendarClock,
  Building2,
  BarChart3,
  Receipt,
  Wallet,
  Calculator,
  Heart,
  Wrench,
  FileCheck,
  Percent,
  Upload,
  Menu,
  X,
  History,
  ShieldCheck,
  FileSignature,
  Repeat,
  CircleHelp,
  SlidersHorizontal,
  ClipboardList,
} from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { APP_NAV_DEFINITIONS, isModuleEnabled, type AppNavDefinition } from '@/lib/modules'

const navIcons = {
  '/app': LayoutDashboard,
  '/app/pokladna': ShoppingCart,
  '/app/restaurace': UtensilsCrossed,
  '/app/kuchyne': ChefHat,
  '/app/mapa-stolu': LayoutGrid,
  '/app/sklad': Package,
  '/app/zasoby': Boxes,
  '/app/naskladneni': ScanBarcode,
  '/app/skladove-doklady': FileText,
  '/app/dodavatele': Building2,
  '/app/nakupni-objednavky': ClipboardList,
  '/app/modifikatory': SlidersHorizontal,
  '/app/dochazka': Clock,
  '/app/smeny': CalendarClock,
  '/app/pobocky': Building2,
  '/app/audit': History,
  '/app/schvalovani': ShieldCheck,
  '/app/konsolidace': BarChart3,
  '/app/provozni-prehled': BarChart3,
  '/app/uzaverka': Receipt,
  '/app/rezervace': CalendarDays,
  '/app/kategorie': Tags,
  '/app/nabidky': FileCheck,
  '/app/faktury': FileText,
  '/app/opakovane-faktury': Repeat,
  '/app/cashflow': Wallet,
  '/app/uctarna': Calculator,
  '/app/dph': Percent,
  '/app/klienti': Users,
  '/app/import': Upload,
  '/app/vernost': Heart,
  '/app/akce-ceny': Percent,
  '/app/zakazky': Wrench,
  '/app/cenik-sluzeb': Wrench,
  '/app/podpisy': FileSignature,
  '/app/predplatne': CreditCard,
  '/app/nastaveni': Settings,
} as const

const auth = useAuthStore()

type SidebarNavItem = AppNavDefinition & { icon: (typeof navIcons)[keyof typeof navIcons] }

const sidebarSections = [
  { id: 'today', label: 'Dnes' },
  { id: 'operations', label: 'Provoz' },
  { id: 'products', label: 'Produkty a sklad' },
  { id: 'team', label: 'Tým' },
  { id: 'finance', label: 'Finance' },
  { id: 'company', label: 'Firma a nastavení' },
] as const

type SidebarSectionId = (typeof sidebarSections)[number]['id']

function sectionForPath(path: string): SidebarSectionId {
  if (path === '/app') return 'today'
  if (
    [
      '/app/pokladna',
      '/app/restaurace',
      '/app/kuchyne',
      '/app/rezervace',
      '/app/uzaverka',
    ].includes(path)
  )
    return 'operations'
  if (
    [
      '/app/sklad',
      '/app/zasoby',
      '/app/naskladneni',
      '/app/skladove-doklady',
      '/app/dodavatele',
      '/app/nakupni-objednavky',
      '/app/modifikatory',
      '/app/kategorie',
    ].includes(path)
  )
    return 'products'
  if (['/app/dochazka', '/app/smeny'].includes(path)) return 'team'
  if (
    [
      '/app/nabidky',
      '/app/faktury',
      '/app/opakovane-faktury',
      '/app/cashflow',
      '/app/uctarna',
      '/app/dph',
      '/app/klienti',
    ].includes(path)
  )
    return 'finance'
  return 'company'
}

const nav = computed<SidebarNavItem[]>(() =>
  APP_NAV_DEFINITIONS.filter((item) => {
    if (!isModuleEnabled(item.module, auth.modules)) return false
    if (auth.role && item.hiddenForRoles?.includes(auth.role)) return false
    return true
  }).map((item) => ({ ...item, icon: navIcons[item.to as keyof typeof navIcons] })),
)
const groupedNav = computed(() =>
  sidebarSections
    .map((section) => ({
      ...section,
      items: nav.value.filter((item) => sectionForPath(item.to) === section.id),
    }))
    .filter((section) => section.items.length > 0),
)
const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)

function isActive(item: SidebarNavItem): boolean {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

async function signOut() {
  await auth.logout()
  router.push('/')
}

// Zavřít mobilní menu při změně cesty
watch(
  () => route.path,
  () => {
    mobileOpen.value = false
  },
)
</script>

<template>
  <!-- Mobilní topbar – jen na malých obrazovkách -->
  <div
    class="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden"
  >
    <SiteLogo />
    <div class="flex items-center gap-1">
      <ThemeToggle />
      <Button variant="ghost" size="icon" aria-label="Otevřít menu" @click="mobileOpen = true">
        <Menu class="h-5 w-5" />
      </Button>
    </div>
  </div>

  <!-- Desktopový sidebar -->
  <aside class="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
    <div class="flex h-16 items-center border-b border-border px-5">
      <SiteLogo />
    </div>

    <nav class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <section v-for="section in groupedNav" :key="section.id">
        <h2 class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {{ section.label }}
        </h2>
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="
            isActive(item)
              ? 'bg-primary-soft text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>
      </section>
    </nav>

    <div class="border-t border-border p-3">
      <Button
        variant="ghost"
        class="mb-2 w-full justify-start gap-2"
        @click="router.push('/app/pruvodce')"
      >
        <CircleHelp class="h-4 w-4" /> Průvodce
      </Button>
      <div class="flex items-center gap-2 rounded-lg p-2 text-sm">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {{ auth.user?.email?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="flex-1 truncate">
          <div class="truncate text-xs font-medium">{{ auth.user?.email }}</div>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" title="Odhlásit se" @click="signOut">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </aside>

  <!-- Mobilní off-canvas overlay -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-50 bg-foreground/40 md:hidden"
    aria-hidden
    @click="mobileOpen = false"
  />

  <!-- Mobilní drawer: zavřený je jen odsunutý transformem, proto inert — jinak by odkazy
       mimo obrazovku zůstaly fokusovatelné klávesnicí a viditelné pro čtečky. -->
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 md:hidden"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    :inert="!mobileOpen"
  >
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <SiteLogo />
      <Button variant="ghost" size="icon" aria-label="Zavřít menu" @click="mobileOpen = false">
        <X class="h-5 w-5" />
      </Button>
    </div>

    <nav class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <section v-for="section in groupedNav" :key="section.id">
        <h2 class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {{ section.label }}
        </h2>
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="
            isActive(item)
              ? 'bg-primary-soft text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>
      </section>
    </nav>

    <div class="border-t border-border p-3">
      <Button
        variant="ghost"
        class="mb-2 w-full justify-start gap-2"
        @click="router.push('/app/pruvodce')"
      >
        <CircleHelp class="h-4 w-4" /> Průvodce
      </Button>
      <div class="flex items-center gap-2 rounded-lg p-2 text-sm">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {{ auth.user?.email?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="flex-1 truncate">
          <div class="truncate text-xs font-medium">{{ auth.user?.email }}</div>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" title="Odhlásit se" @click="signOut">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </aside>
</template>
