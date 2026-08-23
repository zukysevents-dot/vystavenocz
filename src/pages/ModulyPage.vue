<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Check, Circle, Clock3, Lock } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { ApiError } from '@/lib/http'
import { upsellFor } from '@/lib/entitlements'
import { moduleInterestMailto } from '@/lib/landing-cta'
import {
  MODULE_CATALOG,
  moduleState,
  recommendedModules,
  type AppModuleId,
  type ModuleState,
} from '@/lib/modules'

// Jediné místo, kde vedení firmy vidí, co firma používá, co si může přidat, co obsahuje vyšší
// tarif a co se teprve připravuje. Nárok i změnu vynucuje server — tohle je jen srozumitelné UI.
const auth = useAuthStore()
const companyStore = useCompanyStore()
const router = useRouter()

const enabledModules = ref<AppModuleId[]>([...auth.modules])
const loading = ref(true)

onMounted(async () => {
  try {
    enabledModules.value = await companyStore.loadModules()
  } catch {
    enabledModules.value = [...auth.modules] // server nedosažitelný — ukaž poslední známý stav
  } finally {
    loading.value = false
  }
})

// Obor zvolený v onboardingu — jen nápověda „tohle se k vaší práci hodí", nic nezapíná sama.
const recommended = recommendedModules()

// O tarif může požádat jen ten, kdo ho spravuje; ostatní role sem router nepustí.
const canManagePlan = computed(() => auth.canManageSubscription && auth.hasRole('Owner', 'Admin'))

const cards = computed(() =>
  MODULE_CATALOG.map((module) => ({
    ...module,
    state: moduleState(module.id, enabledModules.value, auth.lockedModules),
    upsell: upsellFor(module.id),
  })),
)

const activeCount = computed(() => cards.value.filter((c) => c.state === 'active').length)

const STATE_LABEL: Record<ModuleState, string> = {
  active: 'Aktivní',
  available: 'Není zapnutý',
  locked: 'Vyžaduje vyšší tarif',
  coming_soon: 'Připravujeme',
}

// Zapnutí i vypnutí se potvrzuje — vypnutím zmizí část menu, zapnutím se objeví nová.
// AlertDialogAction dialog zavírá už při kliku, takže `pending` NESMÍ viset na `update:open`
// (jinak by se cíl vynuloval dřív, než akce doběhne) — otevření drží vlastní `confirmOpen`.
const pending = ref<{ id: AppModuleId; label: string; enable: boolean } | null>(null)
const confirmOpen = ref(false)
const saving = ref(false)

function ask(id: AppModuleId, label: string, enable: boolean): void {
  pending.value = { id, label, enable }
  confirmOpen.value = true
}

async function confirmChange(): Promise<void> {
  const target = pending.value
  if (!target || saving.value) return
  saving.value = true
  confirmOpen.value = false
  const next = target.enable
    ? [...enabledModules.value, target.id]
    : enabledModules.value.filter((m) => m !== target.id)
  try {
    enabledModules.value = await companyStore.saveModules(next)
    toast.success(
      target.enable
        ? `${target.label} je zapnutý. V menu se objeví hned.`
        : `${target.label} je vypnutý. Data zůstávají uložená.`,
    )
  } catch (e) {
    // Nárok vynucuje server — když modul odmítne, neukazuj falešný úspěch ani technický důvod.
    toast.error(
      e instanceof ApiError && e.status === 403
        ? 'Tuto část váš tarif neobsahuje. Podívejte se na možnosti rozšíření.'
        : 'Modul se nepodařilo změnit. Zkuste to znovu.',
    )
  } finally {
    saving.value = false
    pending.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <h1 class="text-3xl font-bold tracking-tight">Moduly</h1>
    <p class="mt-1 text-muted-foreground">
      Zapněte si jen to, co skutečně používáte. Dostupné funkce se objeví v menu po uložení změn.
    </p>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <!-- Rychlá cesta pro toho, kdo nechce klikat modul po modulu: vybere obor a sadu dostane. -->
      <Button type="button" variant="outline" size="sm" @click="router.push('/app/onboarding')">
        Vybrat podle oboru
      </Button>
      <p class="text-sm text-muted-foreground" data-testid="modules-summary">
        <template v-if="loading">Načítám moduly…</template>
        <template v-else>Zapnuto {{ activeCount }} z {{ cards.length }} modulů.</template>
      </p>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div
        v-for="module in cards"
        :key="module.id"
        class="flex gap-3 rounded-xl border border-border p-4"
        :class="module.state === 'active' ? 'bg-card' : 'bg-muted/20'"
        :data-testid="`module-${module.id}`"
        :data-state="module.state"
      >
        <span class="mt-0.5 shrink-0" aria-hidden="true">
          <Check v-if="module.state === 'active'" class="h-5 w-5 text-primary" />
          <Lock v-else-if="module.state === 'locked'" class="h-5 w-5 text-muted-foreground" />
          <Clock3
            v-else-if="module.state === 'coming_soon'"
            class="h-5 w-5 text-muted-foreground"
          />
          <Circle v-else class="h-5 w-5 text-muted-foreground" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-foreground">
            {{ module.label }}
            <span
              v-if="module.state === 'available' && recommended.includes(module.id)"
              class="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              Hodí se pro váš obor
            </span>
          </p>
          <p class="mt-1 text-xs text-muted-foreground">{{ module.description }}</p>

          <!-- Zamčený modul mluví o přínosu, ne o tom, co ho blokuje. -->
          <p v-if="module.state === 'locked'" class="mt-2 text-xs text-foreground">
            {{ module.upsell.benefit }}
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              :variant="module.state === 'active' ? 'default' : 'secondary'"
              :data-testid="`module-status-${module.id}`"
            >
              {{ STATE_LABEL[module.state] }}
            </Badge>

            <span v-if="module.required" class="text-xs text-muted-foreground"
              >Vždy zapnuté — je to základ aplikace.</span
            >

            <Button
              v-else-if="module.state === 'available'"
              type="button"
              size="sm"
              :disabled="saving"
              :aria-label="`Přidat modul ${module.label}`"
              @click="ask(module.id, module.label, true)"
            >
              Přidat modul
            </Button>

            <Button
              v-else-if="module.state === 'active'"
              type="button"
              size="sm"
              variant="outline"
              :disabled="saving"
              :aria-label="`Vypnout modul ${module.label}`"
              @click="ask(module.id, module.label, false)"
            >
              Vypnout
            </Button>

            <template v-else-if="module.state === 'locked'">
              <RouterLink v-if="canManagePlan" to="/app/predplatne">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  :aria-label="`Zobrazit možnosti pro ${module.label}`"
                >
                  Zobrazit možnosti
                </Button>
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                Obsahuje {{ module.upsell.plan
                }}<template v-if="module.upsell.priceMonthly">
                  — {{ module.upsell.priceMonthly }} Kč/měs bez DPH</template
                >.
              </span>
            </template>

            <!-- Připravujeme: žádná aktivace, jen bezpečné vyjádření zájmu. -->
            <a
              v-else
              :href="moduleInterestMailto(module.label)"
              class="text-xs font-medium text-primary hover:underline"
            >
              Chci vědět mezi prvními
            </a>
          </div>
        </div>
      </div>
    </div>

    <AlertDialog :open="confirmOpen" @update:open="(v) => (confirmOpen = v)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ pending?.enable ? `Přidat ${pending?.label}?` : `Vypnout ${pending?.label}?` }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="pending?.enable">
              Do menu přibudou obrazovky této části. Kdykoli ji zase vypnete.
            </template>
            <template v-else>
              Obrazovky této části zmizí z menu. Data zůstanou uložená a po opětovném zapnutí je
              uvidíte zase.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmOpen = false">Zpět</AlertDialogCancel>
          <AlertDialogAction data-testid="confirm-module-change" @click="confirmChange">
            {{ pending?.enable ? 'Přidat modul' : 'Vypnout modul' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
