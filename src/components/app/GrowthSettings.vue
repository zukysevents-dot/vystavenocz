<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Gift, Handshake, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import {
  useGrowth,
  type GrowthInvitation,
  type PartnerProfile,
  type ReferralOverview,
} from '@/composables/useGrowth'
import { ApiError, isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

const growth = useGrowth()
const auth = useAuthStore()
const apiMode = isApiMode()
const canManage = auth.hasRole('Owner', 'Admin', 'Manager')
const loading = ref(false)
const creating = ref(false)
const redeeming = ref(false)
const submittingPartner = ref(false)
const referral = ref<GrowthInvitation | null>(null)
const partnerInvitation = ref<GrowthInvitation | null>(null)
const overview = ref<ReferralOverview | null>(null)
const profile = ref<PartnerProfile | null>(null)
const code = ref('')
const businessName = ref('')
const contactEmail = ref('')

async function load() {
  if (!apiMode || !canManage) return
  loading.value = true
  try {
    overview.value = await growth.overview()
    try {
      profile.value = await growth.partner()
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
    }
  } catch {
    toast.error('Doporučení se nepodařilo načíst.')
  } finally {
    loading.value = false
  }
}
async function createReferral() {
  creating.value = true
  try {
    referral.value = await growth.createReferral()
    toast.success('Jednorázový kód je připravený. Zkopírujte ho teď.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Kód se nepodařilo vytvořit.')
  } finally {
    creating.value = false
  }
}
async function redeem() {
  redeeming.value = true
  try {
    await growth.redeem(code.value, crypto.randomUUID())
    code.value = ''
    toast.success('Doporučení jsme zaznamenali. Nárok čeká na první ověřenou platbu.')
    await load()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Kód se nepodařilo ověřit.')
  } finally {
    redeeming.value = false
  }
}
async function submitPartner() {
  submittingPartner.value = true
  try {
    profile.value = await growth.submitPartner(businessName.value, contactEmail.value)
    toast.success('Partnerská přihláška byla odeslaná ke schválení.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Přihlášku se nepodařilo odeslat.')
  } finally {
    submittingPartner.value = false
  }
}
async function createPartnerCode() {
  creating.value = true
  try {
    partnerInvitation.value = await growth.createPartnerInvitation()
    toast.success('Partnerský kód je připravený. Zkopírujte ho teď.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Kód se nepodařilo vytvořit.')
  } finally {
    creating.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-6" data-testid="growth-settings">
    <div class="flex gap-3">
      <Gift class="mt-0.5 h-5 w-5 shrink-0 text-coral" />
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Doporučení a partnerství
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Doporučte Vystaveno jiné firmě. Obě strany získají jeden měsíc až po první ověřené platbě
          nové firmy.
        </p>
      </div>
    </div>
    <p v-if="!apiMode || !canManage" class="mt-4 text-sm text-muted-foreground">
      Tuto část může v online aplikaci spravovat majitel, administrátor nebo vedoucí firmy.
    </p>
    <template v-else>
      <p v-if="loading" class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" /> Načítám stav…
      </p>
      <div v-else class="mt-4 space-y-5">
        <div class="rounded-lg border border-border p-4">
          <p class="font-medium">Váš referral kód</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Platí 90 dní a funguje jednou. Kód nikam neukládáme v čitelné podobě, proto si ho
            zkopírujte hned.
          </p>
          <Button class="mt-3" variant="coral" :disabled="creating" @click="createReferral"
            ><Loader2 v-if="creating" class="h-4 w-4 animate-spin" /> Vytvořit kód</Button
          >
          <p v-if="referral" class="mt-3 break-all rounded bg-muted p-3 font-mono text-sm">
            {{ referral.code }}<br /><span class="font-sans text-muted-foreground"
              >Platí do {{ new Date(referral.expiresAt).toLocaleDateString('cs-CZ') }}.</span
            >
          </p>
          <p v-if="overview" class="mt-3 text-sm text-muted-foreground">
            Aktivní: {{ overview.activeInvitations }} · čeká na platbu:
            {{ overview.capturedInvitations }} · kvalifikováno:
            {{ overview.qualifiedInvitations }} · dostupné měsíce:
            {{ overview.availableFreeMonths }}
          </p>
        </div>
        <form class="rounded-lg border border-border p-4" @submit.prevent="redeem">
          <p class="font-medium">Mám doporučovací nebo partnerský kód</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Uplatněním nevznikne platba ani okamžitá sleva.
          </p>
          <div class="mt-3 flex flex-col gap-3 sm:flex-row">
            <div class="flex-1">
              <Label for="growth-code">Kód</Label
              ><Input id="growth-code" v-model="code" placeholder="VYST-…" :disabled="redeeming" />
            </div>
            <Button class="self-end" type="submit" :disabled="redeeming || !code.trim()"
              >Uplatnit</Button
            >
          </div>
        </form>
        <div class="rounded-lg border border-border p-4">
          <div class="flex gap-2">
            <Handshake class="h-5 w-5 text-coral" />
            <div>
              <p class="font-medium">Partnerský program</p>
              <p class="mt-1 text-sm text-muted-foreground">
                Provize je návrh 20 % z čistého předplatného po 12 měsíců. Vyplácí se čtvrtletně až
                po 30 dnech a až po aktivaci billingu.
              </p>
            </div>
          </div>
          <template v-if="profile"
            ><p class="mt-3 text-sm">
              Stav:
              <strong>{{
                profile.status === 'Approved'
                  ? 'schváleno'
                  : profile.status === 'Candidate'
                    ? 'čeká na schválení'
                    : 'pozastaveno'
              }}</strong>
              · získané firmy: {{ profile.capturedCustomers }} · kvalifikované:
              {{ profile.qualifiedCustomers }} · návrhy provizí: {{ profile.proposedCommissions }}
            </p>
            <Button
              v-if="profile.status === 'Approved'"
              class="mt-3"
              :disabled="creating"
              @click="createPartnerCode"
              >Vytvořit partnerský kód</Button
            >
            <p
              v-if="partnerInvitation"
              class="mt-3 break-all rounded bg-muted p-3 font-mono text-sm"
            >
              {{ partnerInvitation.code }}
            </p></template
          >
          <form v-else class="mt-3 grid gap-3 sm:grid-cols-2" @submit.prevent="submitPartner">
            <div>
              <Label for="partner-name">Název firmy</Label
              ><Input id="partner-name" v-model="businessName" />
            </div>
            <div>
              <Label for="partner-email">Kontaktní e-mail</Label
              ><Input id="partner-email" v-model="contactEmail" type="email" />
            </div>
            <Button
              class="sm:col-span-2 sm:w-fit"
              type="submit"
              :disabled="submittingPartner || !businessName.trim() || !contactEmail.trim()"
              >Odeslat partnerskou přihlášku</Button
            >
          </form>
        </div>
      </div>
    </template>
  </section>
</template>
