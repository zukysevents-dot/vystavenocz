<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Check, Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { upsellFor } from '@/lib/entitlements'

// Stránka, kam router pošle uživatele, který zkusil otevřít část aplikace mimo svůj tarif
// (menu, přímá URL i deep link). Vysvětluje PŘÍNOS, ne technický důvod — žádné 403, žádné
// „module_not_in_plan", žádné názvy API. O změnu tarifu může požádat jen majitel/správce.
const route = useRoute()
const auth = useAuthStore()

const moduleId = computed(() => String(route.params.module ?? ''))
const upsell = computed(() => upsellFor(moduleId.value))
const canManage = computed(() => auth.canManageSubscription && auth.hasRole('Owner', 'Admin'))
</script>

<template>
  <div class="mx-auto max-w-2xl p-4 sm:p-6 md:p-8">
    <div class="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div class="flex items-start gap-4 border-b border-border bg-surface-soft px-6 py-5 sm:px-8">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"
        >
          <Lock class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-foreground">{{ upsell.title }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ upsell.benefit }}</p>
        </div>
      </div>

      <div class="px-6 py-6 sm:px-8">
        <ul v-if="upsell.points.length" class="grid gap-3">
          <li
            v-for="point in upsell.points"
            :key="point"
            class="flex items-start gap-2 text-sm text-foreground"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
            >
              <Check class="h-3 w-3 text-success" />
            </span>
            {{ point }}
          </li>
        </ul>

        <p class="mt-6 rounded-xl bg-surface-soft px-4 py-3 text-sm text-foreground">
          Tuto část obsahuje <strong>{{ upsell.plan }}</strong
          >.
        </p>

        <div v-if="canManage" class="mt-6 flex flex-col gap-3 sm:flex-row">
          <RouterLink to="/app/predplatne" class="sm:flex-1">
            <Button variant="coral" size="lg" class="w-full">Zobrazit možnosti</Button>
          </RouterLink>
          <a href="/#cenik" class="sm:flex-1">
            <Button variant="outline" size="lg" class="w-full">Přejít na ceník</Button>
          </a>
        </div>
        <p v-else class="mt-6 text-sm text-muted-foreground">
          O rozšíření může požádat majitel nebo správce firmy.
        </p>

        <RouterLink to="/app" class="mt-4 inline-block text-sm text-primary hover:underline">
          ← Zpět na přehled
        </RouterLink>
      </div>
    </div>
  </div>
</template>
