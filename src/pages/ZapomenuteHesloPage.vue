<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

const email = ref('')
const submitting = ref(false)
const sent = ref(false)

function onSubmit() {
  submitting.value = true
  submitting.value = false
  sent.value = true
  toast.success('Odkaz pro obnovu hesla byl odeslán.')
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
        <p class="mt-1 text-sm text-muted-foreground">
          Pošleme vám odkaz pro nastavení nového hesla.
        </p>

        <div v-if="sent" class="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          Pokud existuje účet s tímto e-mailem, dorazí vám zpráva s odkazem.
        </div>
        <form v-else class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input id="email" v-model="email" type="email" required />
          </div>
          <Button type="submit" variant="coral" size="lg" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Odeslat odkaz
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
