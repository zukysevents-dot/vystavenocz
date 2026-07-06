<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Mail } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { openCookieSettings } from '@/lib/cookie-consent'

const productLinks = [
  { to: '/funkce', label: 'Moduly a funkce' },
  { to: '/cenik', label: 'Ceník' },
  { to: '/clanky', label: 'Články' },
  { to: '/akce', label: 'Early access' },
  { to: '/nase-sliby', label: 'Naše sliby' },
  { to: '/srovnani', label: 'Srovnání' },
  { to: '/faq', label: 'FAQ' },
]

const year = computed(() => new Date().getFullYear())
</script>

<template>
  <footer class="border-t border-border bg-surface/50">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <SiteLogo />
          <p class="mt-4 max-w-xs text-sm text-muted-foreground">
            Modulární provozní systém pro gastro, služby, řemeslo i obchod — pokladna, kuchyně,
            sklad, rezervace i fakturace. České, postavené v Praze.
          </p>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-foreground">Produkt</h4>
          <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
            <li v-for="l in productLinks" :key="l.to">
              <RouterLink :to="l.to" class="hover:text-foreground">{{ l.label }}</RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-foreground">Kontakt a právní</h4>
          <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="mailto:patrik@vystaveno.cz"
                class="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Mail class="h-3.5 w-3.5" />
                patrik@vystaveno.cz
              </a>
            </li>
            <li>
              <RouterLink to="/podminky" class="hover:text-foreground"
                >Obchodní podmínky</RouterLink
              >
            </li>
            <li>
              <RouterLink to="/gdpr" class="hover:text-foreground">
                GDPR a ochrana soukromí
              </RouterLink>
            </li>
            <li>
              <button type="button" class="hover:text-foreground" @click="openCookieSettings">
                Nastavení cookies
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row"
      >
        <p class="text-xs text-muted-foreground">
          © {{ year }} Vystaveno.cz. Všechna práva vyhrazena.
        </p>
        <p class="text-xs text-muted-foreground">IČO: 24991686 · Neplátce DPH</p>
      </div>
    </div>
  </footer>
</template>
