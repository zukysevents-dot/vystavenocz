<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { BadgeCheck, Check, Clock, Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import { useSubscription } from '@/composables/useSubscription'
import { useSubscriptionPurchase, type BillingPeriod } from '@/composables/useSubscriptionPurchase'
import { upsellFor, daysUntil } from '@/lib/entitlements'
import { APP_MODULES } from '@/lib/modules'
import { saveErrorMessage } from '@/lib/http'

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

// --- Nákup modulů z ceníku ------------------------------------------------------------------
// Stránka nic neaktivuje: vyžádá si adresu platební stránky a přesměruje. Nárok zapíše až
// ověřený webhook na serveru, proto se po návratu z platby netvrdí, že je zaplaceno.
const {
  catalog,
  loading: catalogLoading,
  busy,
  load,
  checkout,
  openPortal,
} = useSubscriptionPurchase()
const route = useRoute()
const period = ref<BillingPeriod>('monthly')
const selected = ref<string[]>([])

onMounted(() => {
  if (route.query.nakup === 'dokonceno')
    toast.success('Děkujeme! Platbu teď ověřujeme.', {
      description:
        'Jakmile ji poskytovatel potvrdí, moduly se zpřístupní samy — obvykle během chvilky.',
    })
  // Nabídku tahá jen ten, kdo smí nakupovat. Ostatním ji server (správně) odmítne a padající
  // požadavek by se na stránce projevil leda chybou v konzoli.
  if (canManage.value) void load().catch(() => undefined)
})

/** Co si firma ještě může koupit. Co už má, se nenabízí — ať nikdo neplatí dvakrát za totéž. */
const offer = computed(() => (catalog.value?.items ?? []).filter((i) => !i.owned))
const canBuy = computed(() => canManage.value && catalog.value?.canCheckout === true)

function toggle(key: string, on: boolean | 'indeterminate' | undefined): void {
  selected.value = on === true ? [...selected.value, key] : selected.value.filter((k) => k !== key)
}

function priceOf(item: { monthlyNet: number; yearlyNet: number }): number {
  return period.value === 'yearly' ? item.yearlyNet : item.monthlyNet
}

const totalNet = computed(() =>
  offer.value.filter((i) => selected.value.includes(i.key)).reduce((sum, i) => sum + priceOf(i), 0),
)
const totalWithVat = computed(() =>
  Math.round(totalNet.value * (1 + (catalog.value?.vatRatePercent ?? 21) / 100)),
)

/** Do kdy má firma vše zdarma. Do té doby brána nic nestrhne. */
const freeUntil = computed(() => {
  const raw = catalog.value?.trialEndsAt
  if (!raw) return null
  const date = new Date(raw)
  return date > new Date() ? date.toLocaleDateString('cs-CZ') : null
})

async function buy(): Promise<void> {
  if (selected.value.length === 0) return
  try {
    window.location.href = await checkout(selected.value, period.value)
  } catch (e) {
    toast.error(saveErrorMessage(e, 'Platbu se nepodařilo otevřít. Zkuste to prosím znovu.'))
  }
}

async function manage(): Promise<void> {
  try {
    const url = await openPortal()
    if (url) window.location.href = url
    else toast.info('Zatím tu není co spravovat — firma nemá žádné placené moduly.')
  } catch (e) {
    toast.error(saveErrorMessage(e, 'Správu předplatného se nepodařilo otevřít.'))
  }
}
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
          Fakturace a klienti zůstávají zdarma, takže vystavovat doklady můžete dál. Data placených
          modulů si můžete prohlížet i vyexportovat; pro další zápisy do nich je potřeba tarif znovu
          aktivovat.
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
            <span v-if="upsellFor(module).priceMonthly" class="text-muted-foreground">
              — {{ upsellFor(module).priceMonthly }} Kč/měs bez DPH
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Přidat moduly -->
    <div class="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h2 class="text-lg font-bold text-foreground">Přidat moduly</h2>

      <p v-if="!canManage" class="mt-1 text-sm text-muted-foreground">
        O rozšíření může požádat majitel nebo správce firmy.
      </p>

      <!-- Brána neběží (nebo běžíme v náhledu bez serveru): nabídnout nákup, který nefunguje,
           by byl falešný slib. Chybějící nabídka se NIKDY nesmí číst jako „máte všechno". -->
      <template v-else-if="!catalog || !catalog.canCheckout">
        <p class="mt-1 text-sm text-muted-foreground">
          Platby online zatím spouštíme. Napište nám, co potřebujete — moduly zapneme ručně a
          potvrdíme e-mailem.
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

      <p v-else-if="catalogLoading" class="mt-1 text-sm text-muted-foreground">Načítám nabídku…</p>

      <p v-else-if="offer.length === 0" class="mt-1 text-sm text-muted-foreground">
        Máte k dispozici všechno, co nabízíme. Děkujeme!
      </p>

      <template v-else>
        <p class="mt-1 text-sm text-muted-foreground">
          Vyberte, co chcete používat. Platíte jen za zvolené moduly, kdykoli je můžete zrušit.
        </p>

        <!-- Měsíčně / ročně -->
        <div class="mt-4 inline-flex rounded-xl border border-border p-1" role="group">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="
              period === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            "
            :aria-pressed="period === 'monthly'"
            @click="period = 'monthly'"
          >
            Měsíčně
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="
              period === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            "
            :aria-pressed="period === 'yearly'"
            @click="period = 'yearly'"
          >
            Ročně <span class="text-xs opacity-80">(2 měsíce zdarma)</span>
          </button>
        </div>

        <ul class="mt-4 space-y-2">
          <li
            v-for="item in offer"
            :key="item.key"
            class="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft p-4"
          >
            <Checkbox
              :id="`kup-${item.key}`"
              :model-value="selected.includes(item.key)"
              @update:model-value="(on) => toggle(item.key, on)"
            />
            <label
              :for="`kup-${item.key}`"
              class="flex flex-1 cursor-pointer items-center justify-between gap-3"
            >
              <span class="font-semibold text-foreground">{{ item.name }}</span>
              <span class="whitespace-nowrap text-sm text-muted-foreground">
                {{ priceOf(item).toLocaleString('cs-CZ') }} Kč{{
                  period === 'yearly' ? '/rok' : '/měs'
                }}
              </span>
            </label>
          </li>
        </ul>

        <div class="mt-4 rounded-2xl bg-surface-soft p-4 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Celkem bez DPH</span>
            <span class="font-semibold text-foreground">
              {{ totalNet.toLocaleString('cs-CZ') }} Kč{{ period === 'yearly' ? '/rok' : '/měs' }}
            </span>
          </div>
          <div class="mt-1 flex items-center justify-between">
            <span class="text-muted-foreground">S DPH {{ catalog?.vatRatePercent }} %</span>
            <span class="font-semibold text-foreground">
              {{ totalWithVat.toLocaleString('cs-CZ') }} Kč{{
                period === 'yearly' ? '/rok' : '/měs'
              }}
            </span>
          </div>
          <p v-if="freeUntil" class="mt-3 text-muted-foreground">
            Do <strong class="text-foreground">{{ freeUntil }}</strong> máte vše zdarma — první
            platba proběhne až po tomto datu. Vybrané moduly začnete používat hned.
          </p>
        </div>

        <Button
          variant="coral"
          size="lg"
          class="mt-4 w-full"
          :disabled="selected.length === 0 || busy || !canBuy"
          @click="buy"
        >
          {{ busy ? 'Otevírám platbu…' : 'Pokračovat k platbě' }}
        </Button>
        <p class="mt-2 text-center text-xs text-muted-foreground">
          Platbu zpracuje ověřený poskytovatel. Údaje o kartě se k nám nedostanou.
        </p>
      </template>

      <!-- Samoobsluha u brány: karta, faktury, zrušení -->
      <button
        v-if="canManage && catalog?.hasBillingAccount"
        type="button"
        class="mt-4 text-sm text-primary hover:underline disabled:opacity-60"
        :disabled="busy"
        @click="manage"
      >
        Spravovat platby a faktury →
      </button>
      <RouterLink
        to="/app/nastaveni"
        class="mt-4 inline-block text-sm text-primary hover:underline"
      >
        Nastavit, které části používáte →
      </RouterLink>
    </div>
  </div>
</template>
