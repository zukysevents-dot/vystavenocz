<script setup lang="ts">
import { ref } from 'vue'
import { type DateValue } from '@internationalized/date'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PinInput, PinInputInput } from '@/components/ui/pin-input'
import { Calendar } from '@/components/ui/calendar'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const inputValue = ref('')
const textareaValue = ref('')

// Standalone ovládací prvky (interaktivní ukázky).
const notify = ref(false)
const volume = ref([50])
const align = ref('center')
const otp = ref<string[]>([])
const dueDate = ref<DateValue>()

// --- Ukázkový validovaný formulář (vee-validate + zod) ---
const formSchema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'Zadej e-mail').email('Neplatný e-mail'),
    plan: z.string().min(1, 'Vyber plán'),
    role: z.enum(['osvc', 'sro'], { required_error: 'Vyber typ podnikání' }),
    terms: z.boolean().refine((v) => v === true, 'Musíš souhlasit s podmínkami'),
  }),
)

const { handleSubmit, handleReset } = useForm({
  validationSchema: formSchema,
  initialValues: { email: '', plan: '', terms: false },
})

const submitted = ref<string | null>(null)
const onSubmit = handleSubmit((values) => {
  submitted.value = JSON.stringify(values, null, 2)
})
function onReset() {
  handleReset()
  submitted.value = null
}
</script>

<template>
  <div class="space-y-10">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">UI Kit</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        F1-14 / F1-15 · primitiva + formulářové prvky (dev-only přehled)
      </p>
    </header>

    <!-- Button -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Button</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button size="icon" aria-label="Přidat"><Plus /></Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>

    <!-- Badge -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Badge</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </section>

    <!-- Form primitiva -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Input · Label · Textarea</h2>
      <div class="grid max-w-sm gap-4">
        <div class="grid gap-1.5">
          <Label for="demo-email">E-mail</Label>
          <Input id="demo-email" v-model="inputValue" type="email" placeholder="jan@firma.cz" />
        </div>
        <div class="grid gap-1.5">
          <Label for="demo-note">Poznámka</Label>
          <Textarea id="demo-note" v-model="textareaValue" placeholder="Napiš něco…" />
        </div>
      </div>
    </section>

    <!-- Card -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Card</h2>
      <Card class="max-w-sm">
        <CardHeader>
          <CardTitle>Faktura #2024-001</CardTitle>
          <CardDescription>Splatnost 30. 6. 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm">Obsah karty — shrnutí položek a celkové částky.</p>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="outline" size="sm">Detail</Button>
          <Button size="sm">Zaplatit</Button>
        </CardFooter>
      </Card>
    </section>

    <!-- Separator · Avatar · AspectRatio · Skeleton -->
    <section class="grid gap-8 sm:grid-cols-2">
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">Separator</h2>
        <p class="text-sm">Nad oddělovačem</p>
        <Separator class="my-3" />
        <p class="text-sm">Pod oddělovačem</p>
      </div>
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">Avatar</h2>
        <div class="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/vuejs.png" alt="Vue" />
            <AvatarFallback>VU</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JN</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">AspectRatio (16:9)</h2>
        <AspectRatio :ratio="16 / 9" class="overflow-hidden rounded-md bg-muted">
          <div class="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            16 / 9
          </div>
        </AspectRatio>
      </div>
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">Skeleton</h2>
        <div class="flex items-center gap-4">
          <Skeleton class="h-10 w-10 rounded-full" />
          <div class="space-y-2">
            <Skeleton class="h-4 w-[160px]" />
            <Skeleton class="h-4 w-[120px]" />
          </div>
        </div>
      </div>
    </section>

    <Separator />

    <!-- Standalone formulářové prvky -->
    <section class="space-y-5">
      <h2 class="text-sm font-medium text-muted-foreground">Formulářové prvky (F1-15)</h2>

      <div class="grid gap-6 sm:grid-cols-2">
        <div class="flex items-center gap-2">
          <Switch id="notify" v-model="notify" />
          <Label for="notify">Posílat upozornění {{ notify ? '(zapnuto)' : '' }}</Label>
        </div>

        <div class="space-y-2">
          <Label>Hlasitost: {{ volume[0] }}</Label>
          <Slider v-model="volume" :max="100" :step="1" class="max-w-xs" />
        </div>

        <div class="space-y-2">
          <Label>Zarovnání</Label>
          <ToggleGroup v-model="align" type="single" variant="outline">
            <ToggleGroupItem value="left">Vlevo</ToggleGroupItem>
            <ToggleGroupItem value="center">Na střed</ToggleGroupItem>
            <ToggleGroupItem value="right">Vpravo</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div class="space-y-2">
          <Label>Ověřovací kód</Label>
          <PinInput v-model="otp" otp>
            <PinInputInput v-for="i in 6" :key="i" :index="i - 1" />
          </PinInput>
        </div>
      </div>
    </section>

    <Separator />

    <!-- Datum: Calendar + DatePicker (F1-16) -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">
        Datum: Calendar + DatePicker (F1-16)
      </h2>
      <div class="flex flex-wrap items-start gap-8">
        <div class="space-y-2">
          <Label>DatePicker (splatnost)</Label>
          <DatePicker v-model="dueDate" placeholder="Vyber datum splatnosti" />
        </div>
        <div class="space-y-2">
          <Label>Calendar (inline)</Label>
          <Calendar v-model="dueDate" locale="cs-CZ" weekday-format="short" />
        </div>
      </div>
    </section>

    <Separator />

    <!-- Validovaný formulář -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">
        Validovaný formulář (vee-validate + zod)
      </h2>

      <form class="grid max-w-sm gap-5" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl>
              <Input type="email" placeholder="jan@firma.cz" v-bind="componentField" />
            </FormControl>
            <FormDescription>Na tuhle adresu pošleme fakturu.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="plan">
          <FormItem>
            <FormLabel>Plán</FormLabel>
            <Select v-bind="componentField">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Vyber plán" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="role">
          <FormItem>
            <FormLabel>Typ podnikání</FormLabel>
            <FormControl>
              <RadioGroup v-bind="componentField">
                <div class="flex items-center gap-2">
                  <RadioGroupItem id="role-osvc" value="osvc" />
                  <Label for="role-osvc" class="font-normal">OSVČ</Label>
                </div>
                <div class="flex items-center gap-2">
                  <RadioGroupItem id="role-sro" value="sro" />
                  <Label for="role-sro" class="font-normal">s.r.o.</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ value, handleChange }" name="terms">
          <FormItem class="flex flex-row items-start gap-2 space-y-0">
            <FormControl>
              <Checkbox :model-value="value" @update:model-value="handleChange" />
            </FormControl>
            <div class="space-y-1 leading-none">
              <FormLabel class="font-normal">Souhlasím s podmínkami</FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        </FormField>

        <div class="flex gap-2">
          <Button type="submit">Odeslat</Button>
          <Button type="button" variant="outline" @click="onReset">Reset</Button>
        </div>
      </form>

      <pre
        v-if="submitted"
        class="max-w-sm overflow-auto rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground"
      >
Odesláno: {{ submitted }}</pre
      >
    </section>
  </div>
</template>
