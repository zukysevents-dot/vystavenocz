<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Gift, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import {
  useSubscriptionClaims,
  type SubscriptionClaimStatus,
} from '@/composables/useSubscriptionClaims'
import { ApiError, isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

const claims = useSubscriptionClaims()
const auth = useAuthStore()
const code = ref('')
const termsVersion = ref('v1')
const status = ref<SubscriptionClaimStatus | null>(null)
const loading = ref(false)
const redeeming = ref(false)
const apiMode = isApiMode()
const canManage = auth.hasRole('Owner', 'Admin', 'Manager')

async function load() {
  if (!apiMode || !canManage) return
  loading.value = true
  try {
    status.value = await claims.getOwn()
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404))
      toast.error('Stav nabídky se nepodařilo načíst.')
  } finally {
    loading.value = false
  }
}

async function redeem() {
  if (!code.value.trim()) return
  redeeming.value = true
  try {
    await claims.redeem(code.value, termsVersion.value, crypto.randomUUID())
    code.value = ''
    await load()
    toast.success('Nárok jsme zaznamenali. O jeho aktivaci vás budeme informovat.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Kód se nepodařilo ověřit.')
  } finally {
    redeeming.value = false
  }
}

onMounted(load)
</script>

<template>
  <section
    class="rounded-xl border border-border bg-card p-6"
    data-testid="subscription-claim-settings"
  >
    <div class="flex gap-3">
      <Gift class="mt-0.5 h-5 w-5 shrink-0 text-coral" />
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Nabídka a doporučení
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Máte akviziční kód? Uplatněte jej pro tuto firmu. Kód pouze zaznamená nárok; předplatné
          ani platbu sám nemění.
        </p>
      </div>
    </div>

    <p v-if="!apiMode" class="mt-4 text-sm text-muted-foreground">
      Uplatnění kódu je dostupné po připojení aplikace k serveru.
    </p>
    <p v-else-if="!canManage" class="mt-4 text-sm text-muted-foreground">
      Kód může uplatnit majitel, administrátor nebo vedoucí firmy.
    </p>
    <template v-else>
      <div v-if="loading" class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" /> Načítám stav…
      </div>
      <div v-else-if="status" class="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p class="font-medium">Nárok je zaznamenán.</p>
        <p class="mt-1 text-muted-foreground">
          {{ status.benefit.availableAfter }} Stav vám ukážeme po dokončení předplatného.
        </p>
      </div>
      <form
        v-else
        class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        @submit.prevent="redeem"
      >
        <div class="min-w-0 flex-1 space-y-1.5">
          <Label for="subscription-claim-code">Akční kód</Label>
          <Input
            id="subscription-claim-code"
            v-model="code"
            autocomplete="off"
            placeholder="Např. START2026"
            :disabled="redeeming"
          />
        </div>
        <Button type="submit" variant="coral" :disabled="redeeming || !code.trim()">
          <Loader2 v-if="redeeming" class="h-4 w-4 animate-spin" />
          {{ redeeming ? 'Ověřuji…' : 'Uplatnit kód' }}
        </Button>
      </form>
    </template>
  </section>
</template>
