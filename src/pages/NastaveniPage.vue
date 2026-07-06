<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ImageUp, Save, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { buildInvoiceNumber } from '@/lib/invoice'
import type { AppModuleId } from '@/lib/modules'
import type { Company, VatMode } from '@/lib/types'

const companyStore = useCompanyStore()
const auth = useAuthStore()

// Max velikost loga (data URL žije v localStorage, držíme ho malé).
const LOGO_MAX_BYTES = 512 * 1024
// Povolené formáty loga — SVG záměrně ne (neověřený obsah renderovaný jako obrázek).
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const vatModes: { value: VatMode; label: string }[] = [
  { value: 'payer', label: 'Plátce DPH' },
  { value: 'identified', label: 'Identifikovaná osoba' },
  { value: 'non_payer', label: 'Neplátce DPH' },
]

const moduleOptions: { id: AppModuleId; label: string; description: string; locked?: boolean }[] = [
  {
    id: 'core',
    label: 'Jádro',
    description: 'Firma, pobočky, uživatelé, klienti a nastavení.',
    locked: true,
  },
  {
    id: 'invoicing',
    label: 'Fakturace',
    description: 'Faktury, nabídky, DPH, cashflow a účetní výstupy.',
  },
  { id: 'pos', label: 'Pokladna', description: 'Prodej, platby, účtenky, uzávěrky a Z-reporty.' },
  { id: 'gastro', label: 'Gastro', description: 'Restaurace, stoly, kuchyně a gastro provoz.' },
  { id: 'stock', label: 'Sklad', description: 'Zásoby, naskladnění, inventury a skladové pohyby.' },
  {
    id: 'attendance',
    label: 'Docházka',
    description: 'Zaměstnanci, směny, příchody, odchody a pauzy.',
  },
  { id: 'booking', label: 'Rezervace', description: 'Služby, zdroje a veřejné rezervace.' },
  { id: 'jobs', label: 'Zakázky', description: 'Výjezdy, práce v terénu a zakázkový provoz.' },
  {
    id: 'reporting',
    label: 'Reporty',
    description: 'Konsolidace, manažerské přehledy a porovnání provozoven.',
  },
  {
    id: 'loyalty',
    label: 'Věrnost',
    description: 'Věrnostní programy, návraty zákazníků a marketing.',
  },
  {
    id: 'ai',
    label: 'AI asistent',
    description: 'Asistent nad doklady, provozem, reporty a doporučeními.',
  },
  {
    id: 'integrations',
    label: 'Integrace',
    description: 'Importy, exporty, účetnictví, API a napojení služeb.',
  },
]

const form = reactive({
  companyName: '',
  fullName: '',
  ico: '',
  dic: '',
  vatMode: 'non_payer' as VatMode,
  street: '',
  city: '',
  zip: '',
  bankAccount: '',
  iban: '',
  swift: '',
  logoUrl: '',
  invoiceNumberPrefix: 'FA',
  invoiceNumberFormat: '{prefix}-{year}-{seq}',
  nextInvoiceSeq: 1,
  defaultPaymentDays: 14,
  publicSlug: '',
})
const enabledModules = ref<AppModuleId[]>([...auth.modules])

onMounted(async () => {
  await companyStore.load()
  try {
    enabledModules.value = await companyStore.loadModules()
  } catch {
    enabledModules.value = auth.modules
  }
  const c = companyStore.company
  if (!c) return
  form.companyName = c.companyName ?? ''
  form.fullName = c.fullName ?? ''
  form.ico = c.ico ?? ''
  form.dic = c.dic ?? ''
  form.vatMode = c.vatMode
  form.street = c.street ?? ''
  form.city = c.city ?? ''
  form.zip = c.zip ?? ''
  form.bankAccount = c.bankAccount ?? ''
  form.iban = c.iban ?? ''
  form.swift = c.swift ?? ''
  form.logoUrl = c.logoUrl ?? ''
  form.invoiceNumberPrefix = c.invoiceNumberPrefix ?? 'FA'
  form.invoiceNumberFormat = c.invoiceNumberFormat ?? '{prefix}-{year}-{seq}'
  form.nextInvoiceSeq = c.nextInvoiceSeq ?? 1
  form.defaultPaymentDays = c.defaultPaymentDays ?? 14
  form.publicSlug = c.publicSlug ?? ''
})

function toggleModule(module: AppModuleId, enabled: boolean | 'indeterminate' | undefined): void {
  if (module === 'core') return
  if (enabled === true) {
    if (!enabledModules.value.includes(module))
      enabledModules.value = [...enabledModules.value, module]
    return
  }
  enabledModules.value = enabledModules.value.filter((m) => m !== module)
}

// Živý náhled, jaké číslo dostane příští faktura.
const numberPreview = computed(() =>
  buildInvoiceNumber(
    form.invoiceNumberPrefix || 'FA',
    form.invoiceNumberFormat || '{prefix}-{year}-{seq}',
    Number(form.nextInvoiceSeq) || 1,
  ),
)
const publicOrderPreview = computed(() => {
  const slug = normalizePublicSlug(form.publicSlug)
  return slug ? `${window.location.origin}/objednavka/${slug}` : ''
})

function normalizePublicSlug(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function onLogoChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!LOGO_TYPES.includes(file.type)) {
    toast.error('Nepodporovaný formát loga. Použijte PNG, JPG nebo WebP.')
    input.value = ''
    return
  }
  if (file.size > LOGO_MAX_BYTES) {
    toast.error('Logo je příliš velké (max 512 kB). Zvolte menší obrázek.')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.logoUrl = reader.result as string
  }
  reader.onerror = () => {
    toast.error('Logo se nepodařilo načíst.')
  }
  reader.readAsDataURL(file)
}

function removeLogo(): void {
  form.logoUrl = ''
}

async function onSubmit(): Promise<void> {
  // Splatnost 0 dní je legitimní (na počkání) — nesmí spadnout do fallbacku přes `|| 14`.
  const dueDays = Number(form.defaultPaymentDays)
  const payload: Partial<Company> = {
    companyName: form.companyName || null,
    fullName: form.fullName || null,
    ico: form.ico || null,
    dic: form.dic || null,
    vatMode: form.vatMode,
    street: form.street || null,
    city: form.city || null,
    zip: form.zip || null,
    bankAccount: form.bankAccount || null,
    iban: form.iban || null,
    swift: form.swift || null,
    logoUrl: form.logoUrl || null,
    invoiceNumberPrefix: form.invoiceNumberPrefix || null,
    invoiceNumberFormat: form.invoiceNumberFormat || null,
    nextInvoiceSeq: Number(form.nextInvoiceSeq) || 1,
    defaultPaymentDays: Number.isFinite(dueDays) && dueDays >= 0 ? Math.floor(dueDays) : 14,
    publicSlug: normalizePublicSlug(form.publicSlug),
    email: auth.user?.email ?? companyStore.company?.email ?? '',
  }
  try {
    await companyStore.save(payload)
    enabledModules.value = await companyStore.saveModules(enabledModules.value)
  } catch (e) {
    // API chyba (validace/síť) nebo localStorage quota (velké logo jako data URL) — neukládej tiše.
    const isQuota = e instanceof Error && e.name === 'QuotaExceededError'
    toast.error(
      isQuota
        ? 'Nastavení se nepodařilo uložit — úložiště je plné. Zmenšete logo.'
        : 'Nastavení se nepodařilo uložit. Zkuste to znovu.',
    )
    return
  }
  toast.success('Nastavení uloženo. Projeví se v nových fakturách.')
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <h1 class="text-3xl font-bold tracking-tight">Nastavení firmy</h1>
    <p class="mt-1 text-muted-foreground">
      Tyto údaje se použijí na nových fakturách (dodavatel, logo, číslování, splatnost).
    </p>

    <form class="mt-8 space-y-6" @submit.prevent="onSubmit">
      <!-- Firma -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Firma</h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="company_name">Název firmy</Label>
            <Input id="company_name" v-model="form.companyName" />
          </div>
          <div class="space-y-2">
            <Label for="full_name">Jméno a příjmení (OSVČ)</Label>
            <Input id="full_name" v-model="form.fullName" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="ico">IČO</Label>
              <Input id="ico" v-model="form.ico" />
            </div>
            <div class="space-y-2">
              <Label for="dic">DIČ</Label>
              <Input id="dic" v-model="form.dic" placeholder="CZ12345678" />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="vat_mode">Režim DPH</Label>
            <Select
              :model-value="form.vatMode"
              @update:model-value="(v) => (form.vatMode = v as VatMode)"
            >
              <SelectTrigger id="vat_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in vatModes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Neplátce a identifikovaná osoba fakturují bez DPH.
            </p>
          </div>
        </div>
      </div>

      <!-- Veřejné odkazy -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Veřejné odkazy
        </h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="public_slug">Veřejný slug</Label>
            <Input
              id="public_slug"
              v-model="form.publicSlug"
              placeholder="moje-bistro"
              @blur="form.publicSlug = normalizePublicSlug(form.publicSlug)"
            />
            <p class="text-xs text-muted-foreground">
              Používá se pro online objednávky, QR stoly a veřejné rezervace.
            </p>
          </div>
          <div v-if="publicOrderPreview" class="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            Online objednávky:
            <span class="break-all font-medium text-foreground">{{ publicOrderPreview }}</span>
          </div>
        </div>
      </div>

      <!-- Sídlo -->
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

      <!-- Moduly -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Moduly</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            v-for="module in moduleOptions"
            :key="module.id"
            class="flex gap-3 rounded-lg border border-border p-4"
            :class="module.locked ? 'bg-muted/30' : 'cursor-pointer hover:bg-muted/40'"
          >
            <Checkbox
              class="mt-0.5"
              :model-value="enabledModules.includes(module.id)"
              :disabled="module.locked"
              @update:model-value="(checked) => toggleModule(module.id, checked)"
            />
            <span>
              <span class="block text-sm font-semibold">{{ module.label }}</span>
              <span class="mt-1 block text-xs text-muted-foreground">{{ module.description }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- Bankovní spojení -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bankovní spojení
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="bank_account">Číslo účtu</Label>
              <Input id="bank_account" v-model="form.bankAccount" placeholder="123456789/0100" />
            </div>
            <div class="space-y-2">
              <Label for="iban">IBAN</Label>
              <Input id="iban" v-model="form.iban" placeholder="CZ65 0800 …" />
            </div>
          </div>
          <div class="space-y-2 sm:max-w-[200px]">
            <Label for="swift">SWIFT / BIC</Label>
            <Input id="swift" v-model="form.swift" placeholder="GIBACZPX" />
          </div>
        </div>
      </div>

      <!-- Logo -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo</h2>
        <div class="mt-4 flex items-center gap-4">
          <div
            class="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30"
          >
            <img
              v-if="form.logoUrl"
              :src="form.logoUrl"
              alt="Logo firmy"
              class="max-h-16 max-w-36 object-contain"
            />
            <span v-else class="text-xs text-muted-foreground">Bez loga</span>
          </div>
          <div class="space-y-2">
            <Label
              for="logo"
              class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <ImageUp class="h-4 w-4" /> Nahrát logo
            </Label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              @change="onLogoChange"
            />
            <Button v-if="form.logoUrl" type="button" variant="ghost" size="sm" @click="removeLogo">
              <Trash2 class="h-4 w-4 text-destructive" /> Odebrat
            </Button>
            <p class="text-xs text-muted-foreground">PNG, JPG nebo WebP, max 512 kB.</p>
          </div>
        </div>
      </div>

      <!-- Číselná řada -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Číselná řada faktur
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="inv_prefix">Prefix</Label>
              <Input id="inv_prefix" v-model="form.invoiceNumberPrefix" placeholder="FA" />
            </div>
            <div class="space-y-2">
              <Label for="inv_seq">Příští pořadové číslo</Label>
              <Input
                id="inv_seq"
                v-model.number="form.nextInvoiceSeq"
                type="number"
                min="1"
                step="1"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="inv_format">Formát čísla</Label>
            <Input id="inv_format" v-model="form.invoiceNumberFormat" />
            <p class="text-xs text-muted-foreground">
              Zástupné značky: <code>{prefix}</code>, <code>{year}</code>, <code>{seq}</code>.
            </p>
          </div>
          <div class="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            Příští faktura: <span class="font-medium text-foreground">{{ numberPreview }}</span>
          </div>
        </div>
      </div>

      <!-- Splatnost -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Výchozí splatnost
        </h2>
        <div class="mt-4 space-y-2 sm:max-w-[220px]">
          <Label for="due_days">Splatnost (dní)</Label>
          <Input
            id="due_days"
            v-model.number="form.defaultPaymentDays"
            type="number"
            min="0"
            step="1"
          />
          <p class="text-xs text-muted-foreground">
            Použije se u nové faktury bez vybraného klienta. Klient s vlastní splatností má
            přednost.
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <Button type="submit" variant="coral">
          <Save class="h-4 w-4" />
          Uložit nastavení
        </Button>
      </div>
    </form>
  </div>
</template>
