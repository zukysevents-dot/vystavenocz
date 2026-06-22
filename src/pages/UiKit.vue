<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Pagination } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Toaster, toast } from '@/components/ui/sonner'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { BarChart, LineChart } from '@/components/ui/chart'

const inputValue = ref('')
const textareaValue = ref('')

// Standalone ovládací prvky (interaktivní ukázky).
const notify = ref(false)
const volume = ref([50])
const align = ref('center')
const otp = ref<string[]>([])
const dueDate = ref<DateValue>()
const currentPage = ref(1)
const progress = ref(60)
const invoices = [
  { id: '2024-001', client: 'Alfa s.r.o.', paid: true, amount: '12 500' },
  { id: '2024-002', client: 'Beta OSVČ', paid: false, amount: '3 200' },
  { id: '2024-003', client: 'Gama a.s.', paid: true, amount: '47 900' },
]

// F1-20: toast + command palette
const commandOpen = ref(false)
function notifySuccess() {
  toast.success('Faktura uložena', {
    description: 'Faktura 2024-004 byla úspěšně vytvořena.',
  })
}
function notifyAction() {
  toast('Faktura odeslána klientovi', {
    description: 'Klient dostane e-mail s odkazem.',
    action: { label: 'Zpět', onClick: () => toast('Odeslání zrušeno') },
  })
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    commandOpen.value = !commandOpen.value
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// F1-21: mock data pro grafy
const revenue = [
  { month: 'Led', value: 42 },
  { month: 'Úno', value: 55 },
  { month: 'Bře', value: 38 },
  { month: 'Dub', value: 71 },
  { month: 'Kvě', value: 64 },
  { month: 'Čvn', value: 88 },
]

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
        F1-14…21 · primitiva, formuláře, datum, overlay, data, grafy (dev-only přehled)
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

    <!-- Overlay: Dialog / AlertDialog / Sheet / Drawer (F1-17) -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">
        Overlay: Dialog · AlertDialog · Sheet · Drawer (F1-17)
      </h2>
      <div class="flex flex-wrap gap-3">
        <!-- Dialog -->
        <Dialog>
          <DialogTrigger as-child>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit profil</DialogTitle>
              <DialogDescription>
                Změň údaje a ulož. Zavři přes ESC, X nebo klikem mimo.
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-1.5">
              <Label for="dlg-name">Jméno</Label>
              <Input id="dlg-name" placeholder="Jan Novák" />
            </div>
            <DialogFooter>
              <DialogClose as-child>
                <Button variant="outline">Zrušit</Button>
              </DialogClose>
              <DialogClose as-child>
                <Button>Uložit</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <!-- AlertDialog -->
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button variant="destructive">AlertDialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu smazat fakturu?</AlertDialogTitle>
              <AlertDialogDescription>
                Tahle akce je nevratná. Faktura bude trvale odstraněna.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction>Smazat</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <!-- Sheet -->
        <Sheet>
          <SheetTrigger as-child>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Postranní panel</SheetTitle>
              <SheetDescription>
                Vyjede zprava. Zavři přes ESC, X nebo klikem mimo.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <!-- Drawer -->
        <Drawer>
          <DrawerTrigger as-child>
            <Button variant="outline">Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Spodní panel</DrawerTitle>
              <DrawerDescription>Vysune se zdola (vaul) a lze ho stáhnout.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose as-child>
                <Button variant="outline">Zavřít</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </section>

    <Separator />

    <!-- Overlay 2: Tooltip / DropdownMenu / HoverCard (F1-18) -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">
        Overlay 2: Tooltip · DropdownMenu · HoverCard (F1-18)
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Tooltip -->
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Nápověda k tlačítku</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <!-- DropdownMenu -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">DropdownMenu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48">
            <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                Profil
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>Nastavení</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Odhlásit se</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- HoverCard -->
        <HoverCard>
          <HoverCardTrigger as-child>
            <Button variant="link">@vystaveno</Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <div class="flex gap-3">
              <Avatar>
                <AvatarFallback>VY</AvatarFallback>
              </Avatar>
              <div class="space-y-1">
                <p class="text-sm font-semibold">Vystaveno.cz</p>
                <p class="text-sm text-muted-foreground">Fakturace pro OSVČ a malé firmy.</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </section>

    <Separator />

    <!-- Data UI (F1-19) -->
    <section class="space-y-6">
      <h2 class="text-sm font-medium text-muted-foreground">
        Data UI: Table · Pagination · Tabs · Accordion · Progress · Breadcrumb (F1-19)
      </h2>

      <!-- Breadcrumb -->
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#">Aplikace</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#">Faktury</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>2024-001</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <!-- Table + Pagination -->
      <div class="space-y-3">
        <Table>
          <TableCaption>Poslední faktury</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead class="text-right">Částka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="inv in invoices" :key="inv.id">
              <TableCell class="font-medium">{{ inv.id }}</TableCell>
              <TableCell>{{ inv.client }}</TableCell>
              <TableCell>
                <Badge :variant="inv.paid ? 'secondary' : 'destructive'">
                  {{ inv.paid ? 'Zaplaceno' : 'Po splatnosti' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">{{ inv.amount }} Kč</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Pagination v-model="currentPage" :total="48" :items-per-page="10" />
        <p class="text-center text-xs text-muted-foreground">Stránka {{ currentPage }} / 5</p>
      </div>

      <!-- Tabs -->
      <Tabs default-value="prehled" class="max-w-md">
        <TabsList>
          <TabsTrigger value="prehled">Přehled</TabsTrigger>
          <TabsTrigger value="polozky">Položky</TabsTrigger>
          <TabsTrigger value="historie">Historie</TabsTrigger>
        </TabsList>
        <TabsContent value="prehled" class="text-sm text-muted-foreground">
          Souhrnné informace o faktuře.
        </TabsContent>
        <TabsContent value="polozky" class="text-sm text-muted-foreground">
          Seznam fakturovaných položek.
        </TabsContent>
        <TabsContent value="historie" class="text-sm text-muted-foreground">
          Historie změn a odeslání.
        </TabsContent>
      </Tabs>

      <!-- Accordion + Progress -->
      <div class="grid gap-8 sm:grid-cols-2">
        <Accordion type="single" collapsible class="max-w-sm">
          <AccordionItem value="a">
            <AccordionTrigger>Jak vystavím fakturu?</AccordionTrigger>
            <AccordionContent class="text-muted-foreground">
              Klikni na „Nová faktura", vyplň údaje a ulož.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Můžu fakturu upravit?</AccordionTrigger>
            <AccordionContent class="text-muted-foreground">
              Ano, dokud nebyla odeslaná klientovi.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div class="space-y-2">
          <Label>Vyplněnost profilu: {{ progress }} %</Label>
          <Progress :model-value="progress" class="max-w-xs" />
          <div class="flex gap-2 pt-1">
            <Button size="sm" variant="outline" @click="progress = Math.max(0, progress - 10)">
              −10
            </Button>
            <Button size="sm" variant="outline" @click="progress = Math.min(100, progress + 10)">
              +10
            </Button>
          </div>
        </div>
      </div>
    </section>

    <Separator />

    <!-- Notifikace (toast) + Command palette (F1-20) -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">
        Notifikace + Command palette (F1-20)
      </h2>
      <div class="flex flex-wrap gap-3">
        <Button variant="outline" @click="notifySuccess">Toast (úspěch)</Button>
        <Button variant="outline" @click="notifyAction">Toast s akcí</Button>
        <Button variant="outline" @click="commandOpen = true">
          Command palette
          <kbd class="ml-2 rounded border bg-muted px-1.5 text-[10px]">⌘K</kbd>
        </Button>
      </div>

      <!-- Inline command -->
      <Command class="max-w-md rounded-lg border shadow-sm">
        <CommandInput placeholder="Hledej příkaz nebo akci…" />
        <CommandList>
          <CommandEmpty>Nic nenalezeno.</CommandEmpty>
          <CommandGroup heading="Návrhy">
            <CommandItem value="nova-faktura">
              Nová faktura
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem value="klienti">Klienti</CommandItem>
            <CommandItem value="nastaveni">
              Nastavení
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Akce">
            <CommandItem value="export">Exportovat data</CommandItem>
            <CommandItem value="odhlasit">Odhlásit se</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>

      <!-- Command v dialogu (⌘K) -->
      <CommandDialog v-model:open="commandOpen">
        <CommandInput placeholder="Napiš příkaz…" />
        <CommandList>
          <CommandEmpty>Nic nenalezeno.</CommandEmpty>
          <CommandGroup heading="Rychlé akce">
            <CommandItem value="dialog-faktura">Nová faktura</CommandItem>
            <CommandItem value="dialog-klient">Nový klient</CommandItem>
            <CommandItem value="dialog-nastaveni">Nastavení</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </section>

    <Separator />

    <!-- Grafy pro dashboard (F1-21) -->
    <section class="space-y-4">
      <h2 class="text-sm font-medium text-muted-foreground">Grafy pro dashboard (F1-21)</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tržby</CardTitle>
            <CardDescription>Posledních 6 měsíců (tis. Kč)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              :data="revenue"
              :x="(_d, i) => i"
              :y="(d) => d.value"
              :x-tick-format="(i) => revenue[i]?.month ?? ''"
              aria-label="Graf tržeb za posledních 6 měsíců v tisících korun"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vystavené faktury</CardTitle>
            <CardDescription>Počet za posledních 6 měsíců</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              :data="revenue"
              :x="(_d, i) => i"
              :y="(d) => d.value"
              :x-tick-format="(i) => revenue[i]?.month ?? ''"
              aria-label="Graf počtu vystavených faktur za posledních 6 měsíců"
            />
          </CardContent>
        </Card>
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

    <!-- Toaster (jednou na stránce; v reálné appce půjde do App.vue / layoutu) -->
    <Toaster />
  </div>
</template>
