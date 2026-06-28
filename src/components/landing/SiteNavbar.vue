<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SiteLogo from '@/components/SiteLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const links = [
  { to: '/funkce', label: 'Moduly' },
  { to: '/srovnani', label: 'Srovnání' },
  { to: '/cenik', label: 'Ceník' },
  { to: '/clanky', label: 'Články' },
  { to: '/akce', label: 'Akce' },
  { to: '/nase-sliby', label: 'Naše sliby' },
  { to: '/faq', label: 'FAQ' },
]

const open = ref(false)
// Po změně routy mobilní menu zavřít (jinak zůstane viset po prokliku).
const route = useRoute()
watch(
  () => route.fullPath,
  () => (open.value = false),
)
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
    >
      <SiteLogo class="shrink-0" />

      <!-- Desktop navigace (od lg) — jemné odkazy s coral podtržením na hover/active. -->
      <nav class="hidden items-center gap-1 lg:flex" aria-label="Hlavní navigace">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-coral after:transition-transform after:duration-200 hover:after:scale-x-100"
          active-class="text-foreground after:scale-x-100"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="hidden shrink-0 items-center gap-2 lg:flex">
        <ThemeToggle />
        <Button variant="ghost" size="sm" as-child>
          <RouterLink to="/prihlaseni">Přihlásit se</RouterLink>
        </Button>
        <Button variant="coral" size="sm" as-child>
          <RouterLink to="/registrace">Vyzkoušet zdarma</RouterLink>
        </Button>
      </div>

      <!-- Mobil / tablet (do lg) -->
      <div class="flex shrink-0 items-center gap-1 lg:hidden">
        <ThemeToggle />
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
          :aria-label="open ? 'Zavřít menu' : 'Otevřít menu'"
          :aria-expanded="open"
          @click="open = !open"
        >
          <X v-if="open" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Mobilní rozbalovací menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div v-if="open" class="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        <nav class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
          <RouterLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            active-class="bg-muted text-foreground"
          >
            {{ l.label }}
          </RouterLink>
          <div class="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" as-child>
              <RouterLink to="/prihlaseni">Přihlásit se</RouterLink>
            </Button>
            <Button variant="coral" size="sm" as-child>
              <RouterLink to="/registrace">Vyzkoušet zdarma</RouterLink>
            </Button>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
