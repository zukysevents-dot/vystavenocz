<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

const router = useRouter()

const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const error = ref('')

function onSubmit() {
  error.value = ''

  if (!password.value || !passwordConfirm.value) {
    error.value = 'Vyplňte obě pole.'
    toast.error(error.value)
    return
  }
  if (password.value.length < 6) {
    error.value = 'Heslo musí mít alespoň 6 znaků.'
    toast.error(error.value)
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'Hesla se neshodují.'
    toast.error(error.value)
    return
  }

  submitting.value = true
  toast.success('Heslo bylo změněno. Můžete se přihlásit.')
  router.push('/prihlaseni')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
    <div class="w-full max-w-md">
      <div class="mb-8 flex justify-center">
        <SiteLogo />
      </div>
      <div class="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 class="text-2xl font-bold tracking-tight">Nastavte si nové heslo</h1>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="password">Nové heslo</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="passwordConfirm">Potvrzení hesla</Label>
            <Input
              id="passwordConfirm"
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" variant="coral" size="lg" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Uložit heslo
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          <RouterLink to="/prihlaseni" class="text-primary hover:underline">
            Zpět na přihlášení
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
