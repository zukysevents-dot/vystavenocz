<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import type { Company } from '@/lib/types'
import { BUSINESS_PROFILES, type BusinessProfileId } from '@/lib/modules'

const companyStore = useCompanyStore()
const auth = useAuthStore()
const router = useRouter()

const submitting = ref(false)

const form = reactive({
  business_profile: 'warehouse' as BusinessProfileId,
  company_name: '',
  ico: '',
  dic: '',
  street: '',
  city: '',
  zip: '',
  bank_account: '',
  iban: '',
  invoice_number_prefix: 'FA',
})

const selectedProfile = computed(() =>
  BUSINESS_PROFILES.find((profile) => profile.id === form.business_profile),
)

onMounted(async () => {
  await companyStore.load()
  const c = companyStore.company
  if (c) {
    form.company_name = c.companyName ?? ''
    form.ico = c.ico ?? ''
    form.dic = c.dic ?? ''
    form.street = c.street ?? ''
    form.city = c.city ?? ''
    form.zip = c.zip ?? ''
    form.bank_account = c.bankAccount ?? ''
    form.iban = c.iban ?? ''
    form.invoice_number_prefix = c.invoiceNumberPrefix ?? 'FA'
  }
})

async function onSubmit() {
  submitting.value = true
  const payload: Partial<Company> = {
    companyName: form.company_name,
    ico: form.ico,
    dic: form.dic,
    street: form.street,
    city: form.city,
    zip: form.zip,
    bankAccount: form.bank_account,
    iban: form.iban,
    invoiceNumberPrefix: form.invoice_number_prefix,
    country: 'CZ',
    email: auth.user?.email ?? '',
    fullName: auth.user?.fullName ?? null,
  }
  try {
    await companyStore.save(payload) // API režim: založí firmu (POST /companies) + uloží nastavení
    const profile = selectedProfile.value
    if (profile) await companyStore.saveModules(profile.modules)
  } catch {
    submitting.value = false
    toast.error('Profil firmy se nepodařilo uložit. Zkuste to znovu.')
    return
  }
  submitting.value = false
  toast.success('Profil firmy uložen.')
  router.push(selectedProfile.value?.setupSteps[0]?.to ?? '/app')
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-8">
    <h1 class="text-3xl font-bold tracking-tight">Doplňte údaje o firmě</h1>
    <p class="mt-1 text-muted-foreground">Tyto údaje se objeví na všech vašich fakturách.</p>

    <form class="mt-8 space-y-6" @submit.prevent="onSubmit">
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Typ podnikání
        </h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            v-for="profile in BUSINESS_PROFILES"
            :key="profile.id"
            class="cursor-pointer rounded-lg border p-4 transition-colors"
            :class="
              form.business_profile === profile.id
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border hover:bg-muted'
            "
          >
            <input
              v-model="form.business_profile"
              class="sr-only"
              type="radio"
              name="business_profile"
              :value="profile.id"
            />
            <span class="block text-sm font-semibold">{{ profile.label }}</span>
            <span class="mt-1 block text-xs text-muted-foreground">{{ profile.description }}</span>
          </label>
        </div>
      </div>

      <div v-if="selectedProfile" class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Doporučený start
        </h2>
        <div class="mt-4 space-y-3">
          <div
            v-for="(step, index) in selectedProfile.setupSteps"
            :key="step.to"
            class="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <div
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
            >
              {{ index + 1 }}
            </div>
            <div>
              <div class="flex items-center gap-1.5 font-medium">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                {{ step.label }}
              </div>
              <p class="mt-1 text-sm text-muted-foreground">{{ step.description }}</p>
            </div>
          </div>
        </div>
        <p class="mt-4 text-xs text-muted-foreground">
          Po uložení profilu otevřeme první krok. Další části zůstanou v levém menu podle zapnutých
          modulů.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Firma</h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="company_name">Název firmy</Label>
            <Input id="company_name" v-model="form.company_name" required />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="ico">IČO</Label>
              <Input id="ico" v-model="form.ico" required />
            </div>
            <div class="space-y-2">
              <Label for="dic">DIČ</Label>
              <Input id="dic" v-model="form.dic" placeholder="CZ12345678" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sídlo</h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="street">Ulice a č.p.</Label>
            <Input id="street" v-model="form.street" />
          </div>
          <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div class="space-y-2">
              <Label for="city">Město</Label>
              <Input id="city" v-model="form.city" />
            </div>
            <div class="space-y-2">
              <Label for="zip">PSČ</Label>
              <Input id="zip" v-model="form.zip" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bankovní spojení
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="bank_account">Číslo účtu</Label>
              <Input id="bank_account" v-model="form.bank_account" placeholder="123456789/0100" />
            </div>
            <div class="space-y-2">
              <Label for="iban">IBAN</Label>
              <Input id="iban" v-model="form.iban" placeholder="CZ65 0800 …" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Číslování faktur
        </h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="invoice_number_prefix">Prefix faktur</Label>
            <Input
              id="invoice_number_prefix"
              v-model="form.invoice_number_prefix"
              placeholder="FA"
            />
          </div>
          <p class="text-xs text-muted-foreground">Příklad: FA-2026-001</p>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" @click="router.push('/app')">Přeskočit</Button>
        <Button type="submit" variant="coral" :disabled="submitting">
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          Uložit a pokračovat
        </Button>
      </div>
    </form>
  </div>
</template>
