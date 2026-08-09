<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { http, isApiMode, ApiError } from '@/lib/http'

// Nastavení nového hesla podle tokenu z e-mailu (?token=...). Úspěch zneplatní všechna
// přihlášení a přesměruje na login.
const route = useRoute()
const router = useRouter()

const password = ref('')
const passwordAgain = ref('')
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  if (!isApiMode()) {
    error.value = 'Obnova hesla funguje jen v online aplikaci.'
    return
  }
  if (password.value !== passwordAgain.value) {
    error.value = 'Hesla se neshodují.'
    return
  }
  error.value = ''
  submitting.value = true
  try {
    await http.postPublic('/auth/reset-password', {
      token: String(route.query.token ?? ''),
      newPassword: password.value,
    })
    toast.success('Heslo změněno. Přihlaste se novým heslem.')
    router.push('/prihlaseni')
  } catch (e) {
    if (e instanceof ApiError && e.status === 422)
      error.value =
        'Odkaz je neplatný nebo vypršel, případně je heslo slabé (min. 8 znaků, písmeno a číslice). Požádejte případně o nový odkaz.'
    else error.value = 'Heslo se nepodařilo změnit. Zkuste to znovu.'
  } finally {
    submitting.value = false
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
        <h1 class="text-2xl font-bold tracking-tight">Nové heslo</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Nastavte si nové heslo (min. 8 znaků, aspoň jedno písmeno a číslice). Všechna dosavadní
          přihlášení se odhlásí.
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="reset-password">Nové heslo</Label>
            <Input
              id="reset-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="reset-password-again">Nové heslo znovu</Label>
            <Input
              id="reset-password-again"
              v-model="passwordAgain"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <p v-if="error" class="text-sm font-medium text-destructive">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Nastavit nové heslo
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            <RouterLink to="/zapomenute-heslo" class="font-semibold text-foreground"
              >Požádat o nový odkaz</RouterLink
            >
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
