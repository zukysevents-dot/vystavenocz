<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Sparkles,
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
} from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'

const navItems = [
  { to: '/app', label: 'Přehled', icon: LayoutDashboard, exact: true },
  { to: '/app/pokladna', label: 'Pokladna', icon: ShoppingCart },
  { to: '/app/restaurace', label: 'Restaurace', icon: UtensilsCrossed },
  { to: '/app/kuchyne', label: 'Kuchyně', icon: ChefHat },
  { to: '/app/mapa-stolu', label: 'Mapa stolů', icon: LayoutGrid },
  { to: '/app/sklad', label: 'Sklad', icon: Package },
  { to: '/app/zasoby', label: 'Zásoby', icon: Boxes },
  { to: '/app/naskladneni', label: 'Naskladnění', icon: ScanBarcode },
  { to: '/app/dochazka', label: 'Docházka', icon: Clock },
  { to: '/app/smeny', label: 'Směny', icon: CalendarClock },
  { to: '/app/pobocky', label: 'Pobočky', icon: Building2 },
  { to: '/app/konsolidace', label: 'Konsolidace', icon: BarChart3 },
  { to: '/app/uzaverka', label: 'Uzávěrka', icon: Receipt },
  { to: '/app/rezervace', label: 'Rezervace', icon: CalendarDays },
  { to: '/app/kategorie', label: 'Kategorie', icon: Tags },
  { to: '/app/nabidky', label: 'Nabídky', icon: FileCheck },
  { to: '/app/faktury', label: 'Faktury', icon: FileText },
  { to: '/app/cashflow', label: 'Cashflow', icon: Wallet },
  { to: '/app/uctarna', label: 'Účtárna', icon: Calculator },
  { to: '/app/dph', label: 'Přehled DPH', icon: Percent },
  { to: '/app/klienti', label: 'Klienti', icon: Users },
  { to: '/app/import', label: 'Import dat', icon: Upload },
  { to: '/app/vernost', label: 'Věrnost', icon: Heart },
  { to: '/app/zakazky', label: 'Zakázky', icon: Wrench },
  { to: '/app/predplatne', label: 'Předplatné', icon: CreditCard },
  { to: '/app/nastaveni', label: 'Nastavení', icon: Settings },
]

const auth = useAuthStore()

// Employee nemá invoices.read (backend vrací 403 na přehled/faktury/klienty) — finanční položky skryjeme.
// Manažerské stránky (Konsolidace, Pobočky) taky skrýt Employee roli — jsou vyhrazené vedení.
// Pozn.: tady jen skrýváme položky Employee (blacklist); závazný gate je whitelist `requiresRole`
// v routeru (dnes role Owner/Manager/Employee). Při případné 4. roli sjednotit se `requiresRole`.
const managerHiddenRoutes = new Set([
  '/app',
  '/app/faktury',
  '/app/klienti',
  '/app/konsolidace',
  '/app/uzaverka',
  '/app/pobocky',
  '/app/import',
])
const nav = computed(() =>
  auth.role === 'Employee' ? navItems.filter((i) => !managerHiddenRoutes.has(i.to)) : navItems,
)
const canInvoice = computed(() => auth.role !== 'Employee')
const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)

function isActive(item: (typeof navItems)[number]): boolean {
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

    <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in nav"
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
    </nav>

    <div class="border-t border-border p-3">
      <button
        v-if="canInvoice"
        type="button"
        class="w-full rounded-lg bg-gradient-to-br from-primary-soft to-accent p-3 text-left text-xs transition-all hover:shadow-md"
        @click="router.push('/app/faktury/editor')"
      >
        <div class="flex items-center gap-2 font-semibold text-primary">
          <Sparkles class="h-3.5 w-3.5" /> AI asistent
        </div>
        <p class="mt-1 text-muted-foreground">Vytvoř novou fakturu pomocí AI</p>
      </button>

      <div class="mt-3 flex items-center gap-2 rounded-lg p-2 text-sm">
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

  <!-- Mobilní drawer -->
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 md:hidden"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <SiteLogo />
      <Button variant="ghost" size="icon" aria-label="Zavřít menu" @click="mobileOpen = false">
        <X class="h-5 w-5" />
      </Button>
    </div>

    <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in nav"
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
    </nav>

    <div class="border-t border-border p-3">
      <button
        v-if="canInvoice"
        type="button"
        class="w-full rounded-lg bg-gradient-to-br from-primary-soft to-accent p-3 text-left text-xs transition-all hover:shadow-md"
        @click="router.push('/app/faktury/editor')"
      >
        <div class="flex items-center gap-2 font-semibold text-primary">
          <Sparkles class="h-3.5 w-3.5" /> AI asistent
        </div>
        <p class="mt-1 text-muted-foreground">Vytvoř novou fakturu pomocí AI</p>
      </button>

      <div class="mt-3 flex items-center gap-2 rounded-lg p-2 text-sm">
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
