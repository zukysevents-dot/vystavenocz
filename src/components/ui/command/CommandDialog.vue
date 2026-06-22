<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { Command } from '.'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const props = withDefaults(
  defineProps<DialogRootProps & { title?: string; description?: string }>(),
  {
    title: 'Příkazová paleta',
    description: 'Hledej příkaz nebo akci',
  },
)

const emits = defineEmits<DialogRootEmits>()

const delegatedProps = reactiveOmit(props, 'title', 'description')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <Dialog v-bind="forwarded">
    <DialogContent class="overflow-hidden p-0">
      <DialogTitle class="sr-only">{{ title }}</DialogTitle>
      <DialogDescription class="sr-only">{{ description }}</DialogDescription>
      <Command
        class="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
      >
        <slot />
      </Command>
    </DialogContent>
  </Dialog>
</template>
