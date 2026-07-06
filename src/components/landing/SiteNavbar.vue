<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SiteLogo from '@/components/SiteLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { DEMO_MAILTO } from '@/lib/landing-cta'

const links = [
  { to: '/funkce', label: 'Moduly' },
  { to: '/srovnani', label: 'Srovnání' },
  { to: '/cenik', label: 'Ceník' },
  { to: '/clanky', label: 'Články' },
  { to: '/akce', label: 'Early access' },
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

// Liquid glass: nahoře panel splývá se stránkou, po scrollu se změní na průsvitné
// „sklo" (blur + saturace + jemný stín). Blur běží pořád — plynule se mění jen barvy.
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300"
    :class="
      scrolled || open
        ? 'border-border/50 bg-background/55 shadow-[0_12px_32px_-20px_rgba(10,4,17,0.55)]'
        : 'border-transparent bg-transparent'
    "
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

      <!-- Aplikace zatím není veřejně spuštěná — login/registraci nepropagujeme, CTA vede na demo. -->
      <div class="hidden shrink-0 items-center gap-2 lg:flex">
        <ThemeToggle />
        <Button variant="coral" size="sm" as-child>
          <a :href="DEMO_MAILTO">Chci demo</a>
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
            <Button variant="coral" size="sm" as-child>
              <a :href="DEMO_MAILTO">Chci demo</a>
            </Button>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
