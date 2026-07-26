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

// Přijetí pozvánky do firmy. Token z URL autorizuje (anonymní backend endpoint
// POST /invitations/{token}/accept). Nový účet vyžaduje jméno + heslo; existující účet
// pole nechá prázdná. Po přijetí se uživatel přihlásí standardně (žádný autologin).
const route = useRoute()
const router = useRouter()

const displayName = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  if (!isApiMode()) {
    toast.error('Přijetí pozvánky funguje jen v online aplikaci.')
    return
  }
  error.value = ''
  submitting.value = true
  try {
    const token = String(route.params.token ?? '')
    await http.postPublic(`/invitations/${encodeURIComponent(token)}/accept`, {
      password: password.value || null,
      displayName: displayName.value.trim() || null,
    })
    toast.success('Pozvánka přijata! Přihlaste se svým e-mailem.')
    router.push('/prihlaseni')
  } catch (e) {
    if (e instanceof ApiError && e.status === 404)
      error.value = 'Pozvánka neexistuje. Zkontrolujte, že jste odkaz/token zkopírovali celý.'
    else if (e instanceof ApiError && e.status === 409)
      error.value = 'Pozvánka už byla přijata, zrušena, nebo jí vypršela platnost.'
    else if (e instanceof ApiError && e.status === 422)
      error.value = 'Vyplňte jméno a heslo (alespoň 8 znaků) — zakládáte si nový účet.'
    else error.value = 'Pozvánku se nepodařilo přijmout. Zkuste to znovu.'
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
        <h1 class="text-2xl font-bold tracking-tight">Pozvánka do firmy</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Přijetím se stanete členem firmy ve Vystaveno. Pokud u nás ještě nemáte účet, zvolte si
          jméno a heslo — jinak nechte pole prázdná.
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="invite-name">Jméno a příjmení (jen nový účet)</Label>
            <Input
              id="invite-name"
              v-model="displayName"
              autocomplete="name"
              placeholder="Jan Novák"
            />
          </div>
          <div class="space-y-2">
            <Label for="invite-password">Heslo (jen nový účet, min. 8 znaků)</Label>
            <Input
              id="invite-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <p v-if="error" class="text-sm font-medium text-destructive">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Přijmout pozvánku
          </Button>
        </form>

        <p class="mt-4 text-center text-sm text-muted-foreground">
          Už jste členem?
          <RouterLink to="/prihlaseni" class="font-semibold text-foreground"
            >Přihlaste se</RouterLink
          >
        </p>
      </div>
    </div>
  </div>
</template>
