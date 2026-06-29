<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  submitting.value = true
  const res = await auth.login(email.value, password.value)
  submitting.value = false
  if (res.ok) {
    toast.success('Vítejte zpět!')
    router.push((route.query.redirect as string) || '/app')
  } else {
    error.value = res.error
    toast.error(res.error)
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
        <h1 class="text-2xl font-bold tracking-tight">Přihlášení</h1>
        <p class="mt-1 text-sm text-muted-foreground">Vítejte zpět ve Vystaveno.</p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="vy@firma.cz"
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password">Heslo</Label>
              <RouterLink to="/zapomenute-heslo" class="text-xs text-primary hover:underline">
                Zapomněli jste?
              </RouterLink>
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" variant="coral" size="lg" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Přihlásit se
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          Nemáte účet?
          <RouterLink to="/registrace" class="font-semibold text-primary hover:underline">
            Zaregistrujte se zdarma
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
