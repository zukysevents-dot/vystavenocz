<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Cookie, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { applyAnalyticsConsent } from '@/lib/analytics'
import { CONSENT_RESET_EVENT, getCookieConsent, saveCookieConsent } from '@/lib/cookie-consent'

const visible = ref(false)
const analyticsOn = ref(false)
// Podrobné volby jsou schované za „Upravit". Rozbalené zabíraly na telefonu (390×844) přes polovinu
// obrazovky a překrývaly hlavní tlačítka i otevřené menu — návštěvník viděl místo úvodu jen cookies.
const detailsOpen = ref(false)
const route = useRoute()
// Provozní obrazovky (POS/KDS): banner překrýval ovládání (filtry sekcí v Kuchyni, horní lištu
// Pokladny) a blokoval obsluhu. Souhlas se odloží na první neprovozní obrazovku — do rozhodnutí
// zůstává analytika vypnutá (opt-in default), takže odklad je z pohledu soukromí bezpečný.
const isPosScreen = computed(() =>
  ['/app/pokladna', '/app/restaurace', '/app/kuchyne'].some((path) => route.path.startsWith(path)),
)
const shown = computed(() => visible.value && !isPosScreen.value)

function check() {
  const existing = getCookieConsent()
  visible.value = !existing
  if (!existing) {
    analyticsOn.value = false // GDPR: opt-in default
    detailsOpen.value = false
  }
}

onMounted(() => {
  check()
  window.addEventListener(CONSENT_RESET_EVENT, check)
})

onUnmounted(() => {
  window.removeEventListener(CONSENT_RESET_EVENT, check)
})

function handleSavePreferences() {
  saveCookieConsent(analyticsOn.value)
  applyAnalyticsConsent(analyticsOn.value)
  visible.value = false
}

function handleAcceptAll() {
  analyticsOn.value = true
  saveCookieConsent(true)
  applyAnalyticsConsent(true)
  visible.value = false
}

function handleNecessaryOnly() {
  saveCookieConsent(false)
  applyAnalyticsConsent(false)
  visible.value = false
}
</script>

<template>
  <div
    v-if="shown"
    role="dialog"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-desc"
    class="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md"
  >
    <div class="rounded-2xl border border-border bg-card p-4 shadow-glow sm:p-5">
      <div class="flex items-start gap-3">
        <div
          class="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex"
        >
          <Cookie class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 id="cookie-banner-title" class="text-sm font-semibold text-foreground">
              Soukromí na Vystaveno
            </h2>
            <button
              type="button"
              aria-label="Zavřít a uložit pouze nezbytné"
              class="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="handleNecessaryOnly"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <p id="cookie-banner-desc" class="mt-1 text-xs text-muted-foreground">
            Nezbytné cookies potřebujeme pro přihlášení, analytiku zapneme jen s vaším souhlasem.
            <RouterLink to="/gdpr" class="text-primary underline">Více v GDPR</RouterLink>.
          </p>

          <div
            v-if="detailsOpen"
            id="cookie-banner-options"
            class="mt-3 space-y-2 rounded-xl border border-border bg-surface-soft/60 p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-xs font-semibold text-foreground">Nezbytné</div>
                <div class="text-[11px] text-muted-foreground">
                  Přihlášení, bezpečnost. Vždy zapnuto.
                </div>
              </div>
              <Switch :model-value="true" disabled aria-label="Nezbytné cookies (vždy aktivní)" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <Label for="cookie-analytics" class="text-xs font-semibold text-foreground">
                  Analytika
                </Label>
                <div class="text-[11px] text-muted-foreground">
                  Měření návštěvnosti — zapneme jen s vaším souhlasem; zatím žádné neběží.
                </div>
              </div>
              <Switch
                id="cookie-analytics"
                v-model="analyticsOn"
                aria-label="Povolit analytické cookies"
              />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="coral" class="flex-1" @click="handleAcceptAll">
              Přijmout vše
            </Button>
            <Button
              v-if="detailsOpen"
              size="sm"
              variant="outline"
              class="flex-1"
              @click="handleSavePreferences"
            >
              Uložit volbu
            </Button>
            <Button size="sm" variant="outline" class="flex-1" @click="handleNecessaryOnly">
              Jen nezbytné
            </Button>
            <!-- Přepínač zůstává v DOM: kdyby po rozbalení zmizel, focus spadne na <body> a uživatel
                 klávesnice ani odečítače se o nových přepínačích nedozví. -->
            <Button
              size="sm"
              variant="ghost"
              :aria-expanded="detailsOpen"
              aria-controls="cookie-banner-options"
              @click="detailsOpen = !detailsOpen"
            >
              {{ detailsOpen ? 'Skrýt volby' : 'Upravit volby' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
