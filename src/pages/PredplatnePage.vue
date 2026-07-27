<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BadgeCheck, Check, Clock, Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useSubscription } from '@/composables/useSubscription'
import { upsellFor, daysUntil } from '@/lib/entitlements'
import { APP_MODULES } from '@/lib/modules'

// Přehled tarifu firmy. VŠECHNA čísla a stavy pocházejí ze serveru — stránka nic nepočítá a nic
// neaktivuje. Dřív tady bylo tlačítko „Aktivovat Pro", které si tarif zapnulo lokálně v prohlížeči.
const auth = useAuthStore()
const { plan, isPaid, isTrial, isGracePeriod, trialDaysLeft } = useSubscription()

const canManage = computed(() => auth.canManageSubscription && auth.hasRole('Owner', 'Admin'))

// Co firma má a co nemá — obojí přímo ze snapshotu, nikdy z lokálního seznamu.
const includedModules = computed(() =>
  APP_MODULES.filter((m) => m !== 'core' && auth.entitlement.modules.includes(m)),
)
const lockedModules = computed(() =>
  APP_MODULES.filter((m) => m !== 'core' && auth.entitlement.lockedModules.includes(m)),
)

const graceDaysLeft = computed(() => daysUntil(plan.value.graceEndsAt))

function dayWord(n: number): string {
  return n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'
}

const isReadOnly = computed(() => auth.entitlement.accessMode === 'read_only')
const isLocked = computed(() => auth.entitlement.accessMode === 'locked')
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <h1 class="text-3xl font-bold tracking-tight">Předplatné</h1>
    <p class="mt-1 text-muted-foreground">Co má vaše firma k dispozici.</p>

    <!-- Aktuální stav -->
    <div
      v-if="isLocked"
      class="mt-6 flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/10 p-4"
    >
      <Lock class="h-5 w-5 shrink-0 text-coral" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">Přístup je pozastavený</p>
        <p class="text-muted-foreground">
          Obraťte se prosím na naši podporu, rádi to s vámi vyřešíme.
        </p>
      </div>
    </div>
    <div
      v-else-if="isReadOnly"
      class="mt-6 flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/10 p-4"
    >
      <Clock class="h-5 w-5 shrink-0 text-coral" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">Předplatné skončilo</p>
        <p class="text-muted-foreground">
          Vaše data zůstávají uložená — můžete si je prohlížet i vyexportovat. Pro další zápisy je
          potřeba tarif znovu aktivovat.
        </p>
      </div>
    </div>
    <div
      v-else-if="isGracePeriod"
      class="mt-6 flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/10 p-4"
    >
      <Clock class="h-5 w-5 shrink-0 text-coral" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">
          Tarif {{ plan.name }} je potřeba obnovit<span v-if="graceDaysLeft !== null">
            — zbývá {{ graceDaysLeft }} {{ dayWord(graceDaysLeft) }}</span
          >
        </p>
        <p class="text-muted-foreground">Zatím funguje všechno jako dřív.</p>
      </div>
    </div>
    <div
      v-else-if="isTrial"
      class="mt-6 flex items-center gap-3 rounded-xl border border-mint/30 bg-mint/10 p-4"
    >
      <Clock class="h-5 w-5 shrink-0 text-mint-foreground" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">
          Zkušební doba tarifu {{ plan.name
          }}<span v-if="trialDaysLeft !== null">
            — zbývá {{ trialDaysLeft }} {{ dayWord(trialDaysLeft) }}</span
          >
        </p>
        <p class="text-muted-foreground">Vyzkoušejte si všechno, co tarif obsahuje.</p>
      </div>
    </div>
    <div
      v-else-if="isPaid"
      class="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4"
    >
      <BadgeCheck class="h-5 w-5 shrink-0 text-success" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">Aktivní tarif: {{ plan.name }}</p>
        <p v-if="plan.renewsAt" class="text-muted-foreground">
          Obnovuje se {{ new Date(plan.renewsAt).toLocaleDateString('cs-CZ') }}.
        </p>
        <p v-else class="text-muted-foreground">Bez omezení doby.</p>
      </div>
    </div>

    <!-- Co je v tarifu -->
    <div class="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div class="border-b border-border bg-surface-soft px-6 py-5 sm:px-8">
        <h2 class="text-xl font-bold text-foreground">V tarifu {{ plan.name }}</h2>
        <p class="text-sm text-muted-foreground">Tyto části aplikace máte k dispozici.</p>
      </div>
      <ul class="grid gap-3 px-6 py-6 sm:grid-cols-2 sm:px-8">
        <li
          v-for="module in includedModules"
          :key="module"
          class="flex items-start gap-2 text-sm text-foreground"
        >
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
          >
            <Check class="h-3 w-3 text-success" />
          </span>
          <span>
            <strong>{{ upsellFor(module).title }}</strong>
            — {{ upsellFor(module).benefit }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Co lze přidat -->
    <div
      v-if="lockedModules.length"
      class="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card"
    >
      <div class="border-b border-border bg-surface-soft px-6 py-5 sm:px-8">
        <h2 class="text-xl font-bold text-foreground">Co můžete přidat</h2>
        <p class="text-sm text-muted-foreground">
          Rozšíření, která zapadnou do vašeho provozu, jakmile je budete potřebovat.
        </p>
      </div>
      <div class="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
        <div
          v-for="module in lockedModules"
          :key="module"
          class="rounded-2xl border border-border bg-surface-soft p-4"
        >
          <div class="flex items-center gap-2">
            <Lock class="h-4 w-4 shrink-0 text-muted-foreground" />
            <p class="font-semibold text-foreground">{{ upsellFor(module).title }}</p>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">{{ upsellFor(module).benefit }}</p>
          <p class="mt-3 text-xs text-foreground">
            Obsahuje <strong>{{ upsellFor(module).plan }}</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- Změna tarifu -->
    <div class="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h2 class="text-lg font-bold text-foreground">Změna tarifu</h2>
      <template v-if="canManage">
        <p class="mt-1 text-sm text-muted-foreground">
          Napište nám, co potřebujete — tarif i rozšíření nastavíme a potvrdíme e-mailem. Ceník
          najdete na veřejných stránkách.
        </p>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href="/#cenik" class="sm:flex-1">
            <Button variant="coral" size="lg" class="w-full">Přejít na ceník</Button>
          </a>
          <a href="mailto:podpora@vystaveno.cz?subject=Změna%20tarifu" class="sm:flex-1">
            <Button variant="outline" size="lg" class="w-full">Napsat podpoře</Button>
          </a>
        </div>
      </template>
      <p v-else class="mt-1 text-sm text-muted-foreground">
        O změnu tarifu může požádat majitel nebo správce firmy.
      </p>
      <RouterLink
        to="/app/nastaveni"
        class="mt-4 inline-block text-sm text-primary hover:underline"
      >
        Nastavit, které části používáte →
      </RouterLink>
    </div>
  </div>
</template>
