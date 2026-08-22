<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type DateValue, getLocalTimeZone } from '@internationalized/date'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const modelValue = defineModel<DateValue>()

// `label` je název pole (např. „Datum splatnosti"), `testId` stabilní úchyt pro testy.
// Vlastní `id` spouštěči ZÁMĚRNĚ nenastavujeme: přebilo by id, které mu generuje Popover, a otevřený
// kalendář by pak přes aria-labelledby odkazoval na neexistující prvek.
const props = withDefaults(
  defineProps<{ placeholder?: string; triggerClass?: string; label?: string; testId?: string }>(),
  {
    placeholder: 'Vyber datum',
    triggerClass: 'w-[240px]',
    label: undefined,
    testId: undefined,
  },
)

// Po výběru data Popover zavřeme.
const open = ref(false)
watch(modelValue, () => {
  open.value = false
})

const formatted = computed(() =>
  modelValue.value
    ? format(modelValue.value.toDate(getLocalTimeZone()), 'dd.MM.yyyy', { locale: cs })
    : '',
)

// Odečítač obrazovky musí slyšet OBOJÍ — které datum se vybírá i jakou hodnotu pole má. Samotný obsah
// tlačítka nese jen hodnotu, samotný popisek by naopak hodnotu zahodil.
const ariaLabel = computed(() =>
  props.label ? `${props.label}: ${formatted.value || props.placeholder}` : undefined,
)
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :aria-label="ariaLabel"
        :data-testid="testId"
        variant="outline"
        :class="
          cn(
            triggerClass,
            'justify-start text-left font-normal',
            !modelValue && 'text-muted-foreground',
          )
        "
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ formatted || placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar v-model="modelValue" locale="cs-CZ" weekday-format="short" />
    </PopoverContent>
  </Popover>
</template>
