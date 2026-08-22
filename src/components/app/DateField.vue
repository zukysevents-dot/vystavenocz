<script setup lang="ts">
/**
 * Výběr data, který navenek mluví ISO řetězcem (`YYYY-MM-DD`) — tak se datum drží i posílá na server.
 *
 * Nativní `<input type="date">` zobrazuje datum podle locale prohlížeče, takže na anglicky nastaveném
 * systému se 9. květen ukázal jako „09/05/2026" a nešlo poznat, jestli jde o květen, nebo září.
 * Tenhle wrapper vždy vypisuje české `dd.MM.yyyy`.
 */
import { computed } from 'vue'
import { type DateValue } from '@internationalized/date'
import { DatePicker } from '@/components/ui/date-picker'
import { dateValueToIso, isoToDateValue } from './date-field'

const modelValue = defineModel<string>({ default: '' })

withDefaults(defineProps<{ placeholder?: string; label?: string; testId?: string }>(), {
  placeholder: 'Vyberte datum',
  label: undefined,
  testId: undefined,
})

const selected = computed<DateValue | undefined>({
  get: () => isoToDateValue(modelValue.value),
  set: (value) => {
    modelValue.value = dateValueToIso(value)
  },
})
</script>

<template>
  <DatePicker
    v-model="selected"
    :placeholder="placeholder"
    :label="label"
    :test-id="testId"
    trigger-class="w-full"
  />
</template>
