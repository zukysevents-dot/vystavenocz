<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import {
  consumeIntent,
  isUserCancelled,
  safeRedirect,
  scrubCallbackUrl,
  type OauthLinkRequired,
} from '@/lib/oauth'

/**
 * Návrat od poskytovatele identity. Stránka vymění `code`+`state` za naši session (výměnu dělá
 * server), a podle výsledku uživatele pustí dál, nebo si vyžádá heslo k existujícímu účtu.
 *
 * `code` a `state` se z adresního řádku mažou hned po přečtení — jednorázový kód nemá co zůstat
 * v historii prohlížeče ani v odkazu, který někdo omylem sdílí.
 */
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

type Phase = 'working' | 'link' | 'failed'
const phase = ref<Phase>('working')
const errorText = ref('')
const link = ref<OauthLinkRequired | null>(null)
const password = ref('')
const linking = ref(false)
const linkError = ref('')
const intent = ref<'login' | 'register'>('login')

/** Kam po dokončení: server řekne `returnTo`, jinak onboarding (nová firma) nebo aplikace. */
function finish(returnTo: string | null, isNewCompany: boolean) {
  const target = returnTo ? safeRedirect(returnTo) : isNewCompany ? '/app/onboarding' : '/app'
  router.replace(target)
}

function fail(message: string) {
  phase.value = 'failed'
  errorText.value = message
}

onMounted(async () => {
  intent.value = consumeIntent()

  const code = typeof route.query.code === 'string' ? route.query.code : null
  const state = typeof route.query.state === 'string' ? route.query.state : null
  const providerError = typeof route.query.error === 'string' ? route.query.error : null
  const provider = typeof route.query.provider === 'string' ? route.query.provider : 'google'
  scrubCallbackUrl()

  if (providerError) {
    fail(
      isUserCancelled(providerError)
        ? 'Přihlášení přes Google bylo zrušeno.'
        : 'Přihlášení přes Google se nepodařilo dokončit. Zkuste to prosím znovu.',
    )
    return
  }
  if (!code || !state) {
    fail('Přihlášení přes Google se nepodařilo dokončit. Zkuste to prosím znovu.')
    return
  }

  try {
    const result = await auth.completeExternalLogin(provider, code, state)
    if (result.ok) {
      toast.success(intent.value === 'register' ? 'Účet vytvořen. Vítejte!' : 'Vítejte zpět!')
      finish(result.returnTo, result.isNewCompany)
      return
    }
    link.value = result.linkRequired
    phase.value = 'link'
  } catch {
    fail('Přihlášení přes Google se nepodařilo dokončit. Zkuste to prosím znovu.')
  }
})

async function onConfirmLink() {
  if (!link.value || linking.value) return
  linkError.value = ''
  linking.value = true
  try {
    await auth.confirmExternalLink(link.value.ticket, password.value)
    toast.success('Účty jsou propojené.')
    finish(null, !auth.companyId)
  } catch {
    // Server nerozlišuje „špatné heslo" a „propadlý lístek" navenek — nesmíme z chyby dělat
    // nápovědu k uhádnutí hesla. Nabídneme obojí: zkusit znovu, nebo začít od začátku.
    linkError.value = 'Heslo se nepodařilo ověřit. Zkuste to prosím znovu.'
  } finally {
    linking.value = false
    password.value = ''
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
    <div class="w-full max-w-md">
      <div class="mb-8 flex justify-center">
        <SiteLogo />
      </div>

      <div class="rounded-2xl border border-border bg-card p-8 shadow-card">
        <!-- Průběh: výměna kódu za session -->
        <div v-if="phase === 'working'" class="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">Dokončujeme přihlášení…</p>
        </div>

        <!-- E-mail patří existujícímu účtu → propojení až po doložení hesla -->
        <form v-else-if="phase === 'link'" class="space-y-4" @submit.prevent="onConfirmLink">
          <h1 class="text-xl font-bold tracking-tight">Tento e-mail už ve Vystaveno používáte</h1>
          <p class="text-sm text-muted-foreground">
            Pro pokračování potvrďte heslo ke svému existujícímu účtu
            <span class="font-medium text-foreground">{{ link?.email }}</span
            >. Google se k němu pak připojí a příště se přihlásíte jedním klepnutím.
          </p>
          <div class="space-y-2">
            <Label for="link-password">Heslo</Label>
            <Input
              id="link-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <p v-if="linkError" class="text-sm text-destructive">{{ linkError }}</p>
          <Button
            type="submit"
            variant="coral"
            size="lg"
            class="w-full"
            :disabled="linking || !password"
          >
            <Loader2 v-if="linking" class="h-4 w-4 animate-spin" />
            Propojit účty
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="w-full"
            @click="router.replace('/prihlaseni')"
          >
            Zpět na přihlášení
          </Button>
        </form>

        <!-- Zrušeno uživatelem nebo chyba poskytovatele -->
        <div v-else class="space-y-4 text-center">
          <h1 class="text-xl font-bold tracking-tight">Přihlášení nedokončeno</h1>
          <p class="text-sm text-muted-foreground">{{ errorText }}</p>
          <Button variant="coral" size="lg" class="w-full" @click="router.replace('/prihlaseni')">
            Zpět na přihlášení
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
