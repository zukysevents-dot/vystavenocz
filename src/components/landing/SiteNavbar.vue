<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SiteLogo from '@/components/SiteLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const links = [
  { to: '/funkce', label: 'Funkce' },
  { to: '/srovnani', label: 'Srovnání' },
  { to: '/cenik', label: 'Ceník' },
  { to: '/clanky', label: 'Články' },
  { to: '/akce', label: 'Akce' },
  { to: '/nase-sliby', label: 'Naše sliby' },
  { to: '/faq', label: 'FAQ' },
]

const open = ref(false)
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <SiteLogo />

      <nav class="hidden items-center gap-5 lg:flex xl:gap-8">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          active-class="text-foreground"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center gap-2 lg:flex">
        <ThemeToggle />
        <Button variant="ghost" size="sm" as-child>
          <RouterLink to="/prihlaseni">Přihlásit se</RouterLink>
        </Button>
        <Button variant="coral" size="sm" as-child>
          <RouterLink to="/registrace">Vyzkoušet zdarma</RouterLink>
        </Button>
      </div>

      <div class="flex items-center gap-1 lg:hidden">
        <ThemeToggle />
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          :aria-label="open ? 'Zavřít menu' : 'Otevřít menu'"
          :aria-expanded="open"
          @click="open = !open"
        >
          <X v-if="open" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div v-if="open" class="border-t border-border bg-background lg:hidden">
      <nav class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          active-class="bg-muted text-foreground"
          @click="open = false"
        >
          {{ l.label }}
        </RouterLink>
        <div class="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" as-child>
            <RouterLink to="/prihlaseni" @click="open = false">Přihlásit se</RouterLink>
          </Button>
          <Button variant="coral" size="sm" as-child>
            <RouterLink to="/registrace" @click="open = false">Vyzkoušet zdarma</RouterLink>
          </Button>
        </div>
      </nav>
    </div>
  </header>
</template>
