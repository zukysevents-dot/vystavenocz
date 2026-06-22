<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Cookie, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { applyAnalyticsConsent } from '@/lib/analytics'
import { CONSENT_RESET_EVENT, getCookieConsent, saveCookieConsent } from '@/lib/cookie-consent'

const visible = ref(false)
const analyticsOn = ref(false)

function check() {
  const existing = getCookieConsent()
  visible.value = !existing
  if (!existing) analyticsOn.value = false // GDPR: opt-in default
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
    v-if="visible"
    role="dialog"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-desc"
    class="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md"
  >
    <div class="rounded-2xl border border-border bg-card p-5 shadow-glow">
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
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
              class="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-surface-soft hover:text-foreground"
              @click="handleNecessaryOnly"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <p id="cookie-banner-desc" class="mt-1 text-xs text-muted-foreground">
            Používáme nezbytné cookies pro přihlášení a — s vaším souhlasem — analytiku pro
            zlepšování služby. Marketingové cookies nepoužíváme.
            <RouterLink to="/gdpr" class="text-primary underline">Více v GDPR</RouterLink>.
          </p>

          <div class="mt-3 space-y-2 rounded-xl border border-border bg-surface-soft/60 p-3">
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
                  Google Analytics & Plausible — měření návštěvnosti.
                </div>
              </div>
              <Switch
                id="cookie-analytics"
                v-model="analyticsOn"
                aria-label="Povolit analytické cookies"
              />
            </div>
          </div>

          <div class="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button size="sm" variant="coral" class="w-full" @click="handleAcceptAll">
              Přijmout vše
            </Button>
            <Button size="sm" variant="outline" class="w-full" @click="handleSavePreferences">
              Uložit volbu
            </Button>
            <Button size="sm" variant="ghost" class="w-full" @click="handleNecessaryOnly">
              Jen nezbytné
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
