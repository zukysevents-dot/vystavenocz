<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarCheck, Loader2, CheckCircle2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePublicBooking, type PublicBookingInput } from '@/composables/usePublicBooking'
import { formatCZK } from '@/lib/invoice'
import type { Service } from '@/lib/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const booking = usePublicBooking()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const submitError = ref(false)
const done = ref(false)
const services = ref<Service[]>([])

const form = ref({
  serviceId: '',
  startsAt: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  note: '',
})

const selectedService = computed(() => services.value.find((s) => s.id === form.value.serviceId))

onMounted(async () => {
  try {
    services.value = await booking.services(slug.value)
    form.value.serviceId = services.value[0]?.id ?? ''
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (submitting.value) return
  if (!form.value.serviceId) return
  if (!form.value.customerName.trim() || !form.value.startsAt) return

  const input: PublicBookingInput = {
    serviceId: form.value.serviceId,
    startsAt: form.value.startsAt,
    customerName: form.value.customerName.trim(),
    customerEmail: form.value.customerEmail.trim() || null,
    customerPhone: form.value.customerPhone.trim() || null,
    note: form.value.note.trim() || null,
  }
  submitting.value = true
  submitError.value = false
  try {
    await booking.book(slug.value, input)
    done.value = true
  } catch {
    submitError.value = true
  } finally {
    submitting.value = false
  }
}

const canSubmit = computed(
  () => !!form.value.serviceId && !!form.value.customerName.trim() && !!form.value.startsAt,
)
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10 sm:py-16">
    <div class="mb-6 flex items-center gap-2">
      <CalendarCheck class="h-6 w-6 text-primary" />
      <h1 class="text-2xl font-bold tracking-tight">Online rezervace</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <!-- Firma nenalezena / rezervace nedostupné -->
    <div v-else-if="loadError" class="rounded-2xl border border-border bg-card p-8 text-center">
      <h2 class="text-lg font-semibold">Rezervace nejsou dostupné</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Odkaz je neplatný nebo tato firma zatím online rezervace nenabízí.
      </p>
    </div>

    <!-- Odesláno -->
    <div v-else-if="done" class="rounded-2xl border border-border bg-card p-8 text-center">
      <CheckCircle2 class="mx-auto h-12 w-12 text-success" />
      <h2 class="mt-4 text-lg font-semibold">Žádost odeslána</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Děkujeme! Termín potvrdíme co nejdříve
        <template v-if="form.customerEmail">na {{ form.customerEmail }}</template
        >.
      </p>
    </div>

    <!-- Žádné služby -->
    <div
      v-else-if="services.length === 0"
      class="rounded-2xl border border-border bg-card p-8 text-center"
    >
      <h2 class="text-lg font-semibold">Zatím žádné služby</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Firma zatím nenabízí žádné služby k rezervaci.
      </p>
    </div>

    <!-- Formulář -->
    <form
      v-else
      class="space-y-4 rounded-2xl border border-border bg-card p-6"
      @submit.prevent="submit"
    >
      <div class="grid gap-1.5">
        <Label for="pb-service">Služba</Label>
        <select
          id="pb-service"
          v-model="form.serviceId"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option v-for="s in services" :key="s.id" :value="s.id">
            {{ s.name }} · {{ s.durationMinutes }} min · {{ formatCZK(s.price) }}
          </option>
        </select>
        <p v-if="selectedService" class="text-xs text-muted-foreground">
          Doba trvání {{ selectedService.durationMinutes }} min · cena
          {{ formatCZK(selectedService.price) }}
        </p>
      </div>

      <div class="grid gap-1.5">
        <Label for="pb-when">Preferovaný termín</Label>
        <Input id="pb-when" v-model="form.startsAt" type="datetime-local" />
      </div>

      <div class="grid gap-1.5">
        <Label for="pb-name">Jméno</Label>
        <Input id="pb-name" v-model="form.customerName" placeholder="Vaše jméno" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="grid gap-1.5">
          <Label for="pb-email">E-mail</Label>
          <Input id="pb-email" v-model="form.customerEmail" type="email" placeholder="nepovinné" />
        </div>
        <div class="grid gap-1.5">
          <Label for="pb-phone">Telefon</Label>
          <Input id="pb-phone" v-model="form.customerPhone" placeholder="nepovinné" />
        </div>
      </div>

      <div class="grid gap-1.5">
        <Label for="pb-note">Poznámka</Label>
        <Textarea id="pb-note" v-model="form.note" rows="2" placeholder="nepovinné" />
      </div>

      <p v-if="submitError" class="text-sm text-destructive">
        Odeslání se nezdařilo. Zkuste to prosím znovu.
      </p>

      <Button type="submit" variant="coral" class="w-full" :disabled="!canSubmit || submitting">
        <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
        Odeslat žádost o rezervaci
      </Button>
      <p class="text-center text-xs text-muted-foreground">
        Odesláním nezávazně žádáte o termín — firma jej potvrdí.
      </p>
    </form>
  </div>
</template>
