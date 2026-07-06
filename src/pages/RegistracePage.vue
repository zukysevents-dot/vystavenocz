<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const agreed = ref(false)
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Heslo musí mít alespoň 8 znaků.'
    toast.error(error.value)
    return
  }
  if (!agreed.value) {
    error.value =
      'Pro registraci musíte souhlasit s obchodními podmínkami a zpracováním osobních údajů.'
    toast.error(error.value)
    return
  }
  submitting.value = true
  const res = await auth.register(email.value, password.value, fullName.value || null)
  submitting.value = false
  if (res.ok) {
    toast.success('Účet vytvořen. Vítejte!')
    router.push('/app/onboarding')
  } else {
    error.value = res.error
    toast.error(res.error)
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
    <div class="w-full max-w-lg">
      <div class="mb-8 flex justify-center">
        <SiteLogo />
      </div>
      <div class="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 class="text-2xl font-bold tracking-tight">Vytvořit účet</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Vystaveno běží v režimu early access — účty zakládáme prvním zákazníkům po domluvě na
          <a href="mailto:patrik@vystaveno.cz" class="font-medium underline">patrik@vystaveno.cz</a
          >.
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="fullName">Jméno a příjmení</Label>
            <Input id="fullName" v-model="fullName" required placeholder="Jan Novák" />
          </div>
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="jan@firma.cz"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">Heslo (min. 8 znaků)</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              :minlength="8"
            />
          </div>

          <div class="flex items-start gap-2">
            <Checkbox id="terms" v-model="agreed" class="mt-0.5" />
            <Label for="terms" class="text-sm font-normal leading-relaxed text-muted-foreground">
              Souhlasím s
              <RouterLink
                to="/podminky"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary hover:underline"
              >
                obchodními podmínkami
              </RouterLink>
              a
              <RouterLink
                to="/gdpr"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary hover:underline"
              >
                zpracováním osobních údajů
              </RouterLink>
              .
            </Label>
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button
            type="submit"
            variant="coral"
            size="lg"
            class="w-full"
            :disabled="submitting || !agreed"
          >
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Vytvořit účet zdarma
          </Button>

          <p class="text-center text-xs text-muted-foreground">
            Registrací souhlasíte s podmínkami služby.
          </p>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          Už máte účet?
          <RouterLink to="/prihlaseni" class="font-semibold text-primary hover:underline">
            Přihlaste se
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
