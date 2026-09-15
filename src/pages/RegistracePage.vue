<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Building2, CheckCircle2, Loader2 } from 'lucide-vue-next'
import SiteLogo from '@/components/SiteLogo.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import { useAres } from '@/composables/useAres'
import { isValidIco, normalizeIco } from '@/lib/ico'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const ico = ref('')
const agreed = ref(false)
const submitting = ref(false)
const error = ref('')
// Validační hlášky ze serveru připnuté ke konkrétnímu poli („Heslo musí obsahovat číslici."),
// aby uživatel viděl, co opravit — dřív se všechno slilo do jedné obecné věty nad tlačítkem.
const fieldError = ref<Record<string, string>>({})
// Chybějící souhlas se zvýrazní až po pokusu o odeslání — do té doby formulář nic nevyčítá.
const termsMissing = ref(false)
// Jakmile uživatel souhlas zaškrtne, výtka musí zmizet hned — ne až po dalším odeslání.
watch(agreed, (checked) => {
  if (checked) termsMissing.value = false
})

// Registrace zakládá FIRMU, takže IČO musí existovat v ARES — jinak vznikaly účty s vymyšleným
// („1234567") nebo prázdným IČO a uživatel si ho pak neměl kde doplnit. Ověřuje se před odesláním
// formuláře, aby bylo hned vidět, jaká firma se zakládá; poslední slovo má stejně server.
const { lookup, loading: aresLoading, data: aresCompany, reset: resetAres } = useAres()
const icoError = ref('')

// Ověřená firma platí jen pro IČO, které je právě v poli — po přepsání se výsledek zahodí.
watch(ico, (value) => {
  icoError.value = ''
  if (aresCompany.value && normalizeIco(value) !== aresCompany.value.ico) resetAres()
})

const verifiedCompany = computed(() =>
  aresCompany.value && normalizeIco(ico.value) === aresCompany.value.ico ? aresCompany.value : null,
)

// Vrátí true, když je firma ověřená (a případně ji doověří). Prázdné/nesmyslné IČO neposílá do ARES.
async function ensureCompanyVerified(): Promise<boolean> {
  if (verifiedCompany.value) return true
  if (!isValidIco(ico.value)) {
    icoError.value = 'Zadejte platné IČO (8 číslic včetně kontrolní číslice).'
    return false
  }
  const found = await lookup(ico.value, { silent: true, anonymous: true })
  if (!found) {
    icoError.value = 'Firmu s tímto IČO jsme v rejstříku ARES nenašli. Zkontrolujte číslo.'
    return false
  }
  ico.value = found.ico // normalizované IČO (vedoucí nuly, bez mezer)
  return true
}

// Ověření při opuštění pole — uživatel vidí název firmy dřív, než formulář odešle.
// Hodnota, která už jednou neprošla, se znovu do rejstříku neposílá (chyba u pole platí, dokud
// uživatel IČO nezmění) — jinak by pár přeskoků mezi poli zbytečně spálilo limit dotazů.
function onIcoBlur() {
  if (ico.value.trim() && !verifiedCompany.value && !icoError.value) void ensureCompanyVerified()
}

async function onSubmit() {
  error.value = ''
  fieldError.value = {}
  termsMissing.value = !agreed.value
  if (password.value.length < 8) {
    fieldError.value = { password: 'Heslo musí mít alespoň 8 znaků.' }
    toast.error('Heslo musí mít alespoň 8 znaků.')
    return
  }
  submitting.value = true
  const companyOk = await ensureCompanyVerified()
  if (!companyOk) {
    submitting.value = false
    toast.error(icoError.value)
    return
  }
  if (!agreed.value) {
    submitting.value = false
    toast.error('Ještě potvrďte souhlas s podmínkami.')
    return
  }
  const res = await auth.register(email.value, password.value, fullName.value || null, ico.value)
  submitting.value = false
  if (res.ok) {
    toast.success('Účet vytvořen. Vítejte!')
    router.push('/app/onboarding')
    return
  }
  // Server rozlišuje pole → hlášku ukážeme přímo u něj. `displayName` je v UI „Jméno a příjmení".
  const fields = res.fields ?? {}
  fieldError.value = Object.fromEntries(
    Object.entries(fields).map(([field, messages]) => [
      field === 'displayname' ? 'fullname' : field,
      messages.join(' '),
    ]),
  )
  // Obecnou hlášku nad tlačítkem i v toastu opakujeme jen tehdy, když k žádnému poli nepatří —
  // jinak by uživatel četl „Registrace selhala. Zkuste to znovu." k chybě, kterou vidí u pole
  // a která se opakováním sama nespraví.
  const messages = Object.values(fieldError.value)
  error.value = messages.length ? '' : res.error
  toast.error(messages.length ? messages.join(' ') : res.error)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
    <div class="w-full max-w-lg">
      <div class="mb-8 flex justify-center">
        <SiteLogo />
      </div>
      <div class="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 class="text-2xl font-bold tracking-tight">Začněte zdarma</h1>
        <p class="mt-1 text-sm text-muted-foreground">14 dní bez karty. Plné funkce.</p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="fullName">Jméno a příjmení</Label>
            <Input
              id="fullName"
              v-model="fullName"
              required
              placeholder="Jan Novák"
              :aria-invalid="Boolean(fieldError.fullname)"
              :aria-describedby="fieldError.fullname ? 'fullName-error' : undefined"
            />
            <p v-if="fieldError.fullname" id="fullName-error" class="text-sm text-destructive">
              {{ fieldError.fullname }}
            </p>
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
              :aria-invalid="Boolean(fieldError.email)"
              :aria-describedby="fieldError.email ? 'email-error' : undefined"
            />
            <p v-if="fieldError.email" id="email-error" class="text-sm text-destructive">
              {{ fieldError.email }}
            </p>
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
              :aria-invalid="Boolean(fieldError.password)"
              :aria-describedby="fieldError.password ? 'password-error' : undefined"
            />
            <p v-if="fieldError.password" id="password-error" class="text-sm text-destructive">
              {{ fieldError.password }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="ico">IČO firmy</Label>
            <div class="relative">
              <Input
                id="ico"
                v-model="ico"
                inputmode="numeric"
                required
                placeholder="27082440"
                :aria-invalid="!!icoError"
                :aria-describedby="icoError ? 'ico-hint' : 'ico-help'"
                @blur="onIcoBlur"
              />
              <Loader2
                v-if="aresLoading"
                class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              />
            </div>
            <p v-if="icoError" id="ico-hint" class="text-sm text-destructive">{{ icoError }}</p>
            <p v-else-if="!verifiedCompany" id="ico-help" class="text-xs text-muted-foreground">
              Údaje firmy načteme z veřejného rejstříku ARES — nemusíte je přepisovat.
            </p>
            <div
              v-if="verifiedCompany"
              data-testid="registrace-ares-firma"
              class="flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-sm"
            >
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div class="flex items-center gap-1.5 font-medium text-foreground">
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  {{ verifiedCompany.companyName ?? `IČO ${verifiedCompany.ico}` }}
                </div>
                <p class="text-muted-foreground">
                  {{
                    [verifiedCompany.street, verifiedCompany.zip, verifiedCompany.city]
                      .filter(Boolean)
                      .join(', ') || `IČO ${verifiedCompany.ico}`
                  }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="flex items-start gap-2 rounded-lg transition-colors"
            :class="termsMissing ? 'bg-destructive/10 p-2 ring-1 ring-destructive' : ''"
          >
            <Checkbox
              id="terms"
              v-model="agreed"
              class="mt-0.5"
              :aria-invalid="termsMissing"
              :aria-describedby="termsMissing ? 'terms-hint' : undefined"
            />
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

          <p v-if="termsMissing" id="terms-hint" class="text-sm text-destructive">
            Ještě potvrďte souhlas s podmínkami.
          </p>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <!-- Tlačítko zůstává aktivní i bez souhlasu a bez ověřeného IČO: zašedlé tlačítko bez
               vysvětlení vypadá jako rozbitý formulář. Co chybí, se ukáže až po odeslání u pole. -->
          <Button type="submit" variant="coral" size="lg" class="w-full" :disabled="submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Vytvořit účet zdarma
          </Button>
        </form>

        <GoogleSignInButton intent="register" />

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
