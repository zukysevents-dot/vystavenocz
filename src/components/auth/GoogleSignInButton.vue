<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { isApiMode } from '@/lib/http'
import { rememberIntent, type OauthIntent } from '@/lib/oauth'
import { useAuthStore } from '@/stores/auth'

/**
 * Jediné tlačítko pro přihlášení i registraci — Google flow sám rozhodne, co se stane
 * (přihlásit / založit účet / vyžádat propojení). Liší se jen text a očekávání uživatele.
 *
 * Klient nikdy nedrží tajemství poskytovatele: zavolá `/auth/external/google/start` a přesměruje
 * na URL, kterou vydal server (ten drží state, nonce i PKCE).
 */
const props = withDefaults(defineProps<{ intent?: OauthIntent }>(), { intent: 'login' })

const auth = useAuthStore()
const route = useRoute()
const loading = ref(false)

const label = props.intent === 'register' ? 'Registrovat se přes Google' : 'Pokračovat přes Google'

async function onClick() {
  if (loading.value) return // dvojklik nesmí založit dvě OAuth session
  loading.value = true
  try {
    rememberIntent(props.intent)
    // Kam se má uživatel vrátit po dokončení (?redirect z guardu). Server hodnotu znovu ověří.
    const returnTo = typeof route.query.redirect === 'string' ? route.query.redirect : null
    const authorizeUrl = await auth.startExternalLogin('google', returnTo)
    window.location.assign(authorizeUrl)
  } catch {
    loading.value = false
    toast.error('Přihlášení přes Google se nepodařilo dokončit. Zkuste to prosím znovu.')
  }
}
</script>

<template>
  <!-- Bez serveru (náhled) by tlačítko jen selhalo — radši ho vůbec nenabízet. -->
  <div v-if="isApiMode()" class="mt-6">
    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs uppercase tracking-wide text-muted-foreground">nebo</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <Button
      type="button"
      variant="outline"
      size="lg"
      class="mt-4 w-full gap-3"
      :disabled="loading"
      :aria-label="label"
      @click="onClick"
    >
      <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
      <!-- Oficiální Google „G" (Google branding guidelines: nepřebarvovat, nedeformovat). -->
      <svg v-else class="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
      {{ label }}
    </Button>
  </div>
</template>
