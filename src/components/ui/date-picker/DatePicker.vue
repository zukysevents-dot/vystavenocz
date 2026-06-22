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

withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: 'Vyber datum',
})

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
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="
          cn(
            'w-[240px] justify-start text-left font-normal',
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
