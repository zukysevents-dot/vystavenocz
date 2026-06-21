<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Lock, Sparkles } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

defineProps<{
  open: boolean
  reason?: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-coral"
        >
          <Lock class="h-6 w-6" />
        </div>
        <DialogTitle class="text-center text-xl">Zkušební doba skončila</DialogTitle>
        <DialogDescription class="text-center">
          {{
            reason ||
            'Pro vystavení faktury aktivujte tarif Vystaveno Pro. Vaše data zůstávají uložená.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="rounded-2xl border border-border bg-surface-soft p-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles class="h-4 w-4 text-coral" /> Vystaveno Pro
        </div>
        <p class="mt-1 text-2xl font-bold text-foreground">
          100 Kč <span class="text-sm font-normal text-muted-foreground">/ měsíc</span>
        </p>
        <p class="text-xs text-muted-foreground">
          Při ročním tarifu (1 200 Kč/rok). Měsíčně 159 Kč. Cena je konečná — neplátce DPH.
        </p>
      </div>

      <DialogFooter class="flex-col-reverse gap-2 sm:flex-row">
        <Button variant="ghost" @click="emit('update:open', false)">Zatím ne</Button>
        <Button variant="coral" class="sm:flex-1" as-child>
          <RouterLink to="/app/predplatne">Aktivovat předplatné</RouterLink>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
