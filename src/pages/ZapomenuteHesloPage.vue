<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { http, isApiMode, ApiError } from '@/lib/http'

// Žádost o obnovu hesla. Server záměrně neprozrazuje, jestli e-mail existuje —
// po odeslání se vždy ukáže stejné potvrzení (kromě 503 = e-maily nejsou nakonfigurované).
const email = ref('')
const submitting = ref(false)
const done = ref(false)
const error = ref('')

async function onSubmit() {
  if (!isApiMode()) {
    error.value = 'Obnova hesla funguje jen v online aplikaci.'
    return
  }
  error.value = ''
  submitting.value = true
  try {
    await http.postPublic('/auth/forgot-password', { email: email.value.trim() })
    done.value = true
  } catch (e) {
    if (e instanceof ApiError && e.status === 503)
      error.value = 'Odesílání e-mailů teď není dostupné. Zkuste to později, nebo napište podpoře.'
    else if (e instanceof ApiError && e.status === 422) error.value = 'Zadejte platný e-mail.'
    else error.value = 'Žádost se nepodařilo odeslat. Zkuste to znovu.'
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
        <h1 class="text-2xl font-bold tracking-tight">Zapomenuté heslo</h1>

        <template v-if="done">
          <p class="mt-4 text-sm text-muted-foreground">
            Pokud e-mail <strong class="text-foreground">{{ email }}</strong> u nás má účet, poslali
            jsme na něj odkaz pro nastavení nového hesla. Odkaz platí 1 hodinu.
          </p>
          <p class="mt-4 text-center text-sm text-muted-foreground">
            <RouterLink to="/prihlaseni" class="font-semibold text-foreground"
              >Zpět na přihlášení</RouterLink
            >
          </p>
        </template>

        <form v-else class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <p class="text-sm text-muted-foreground">
            Zadejte e-mail svého účtu — pošleme vám odkaz pro nastavení nového hesla.
          </p>
          <div class="space-y-2">
            <Label for="forgot-email">E-mail</Label>
            <Input
              id="forgot-email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="vy@firma.cz"
            />
          </div>
          <p v-if="error" class="text-sm font-medium text-destructive">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Poslat odkaz
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            <RouterLink to="/prihlaseni" class="font-semibold text-foreground"
              >Zpět na přihlášení</RouterLink
            >
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
