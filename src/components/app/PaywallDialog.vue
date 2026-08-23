<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'

// Dialog, který se ukáže, když firma nemá plný přístup a zkusí vystavit fakturu.
//
// Dřív tady bylo „aktivujte tarif Vystaveno Pro za 159 Kč / 100 Kč měsíčně při ročním tarifu,
// cena je konečná — neplátce DPH". Se schváleným sazebníkem to bylo NEPRAVDIVÉ hned třikrát:
// tarif „Vystaveno Pro" ceník neprodává, ceny se uvádějí bez DPH a fakturace se dnes prodává
// jako součást bezplatného základu. Dialog proto žádnou cenu netvrdí — stav i cesta k obnovení
// patří na stránku Předplatné, kde čísla pocházejí ze serveru.
const auth = useAuthStore()

defineProps<{
  open: boolean
  reason?: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Pozastavený přístup je provozní/obchodní zásah, ne nabídka — upsell by tam byl nemístný.
const isLocked = computed(() => auth.entitlement.accessMode === 'locked')
const canManage = computed(() => auth.canManageSubscription && auth.hasRole('Owner', 'Admin'))
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
        <DialogTitle class="text-center text-xl">
          {{ isLocked ? 'Přístup je pozastavený' : 'Novou fakturu teď nevystavíte' }}
        </DialogTitle>
        <DialogDescription class="text-center">
          {{
            reason ||
            (isLocked
              ? 'Obraťte se prosím na naši podporu, rádi to s vámi vyřešíme.'
              : 'Předplatné skončilo. Nové doklady zatím nejdou vystavit.')
          }}
        </DialogDescription>
      </DialogHeader>

      <div
        class="rounded-2xl border border-border bg-surface-soft p-4 text-sm text-muted-foreground"
      >
        Vaše data zůstávají uložená — faktury i klienty si můžete prohlížet a vyexportovat.
      </div>

      <DialogFooter class="flex-col-reverse gap-2 sm:flex-row">
        <Button variant="ghost" @click="emit('update:open', false)">Rozumím</Button>
        <Button v-if="isLocked" variant="coral" class="sm:flex-1" as-child>
          <a href="mailto:podpora@vystaveno.cz?subject=Pozastaven%C3%BD%20p%C5%99%C3%ADstup">
            Napsat podpoře
          </a>
        </Button>
        <Button v-else-if="canManage" variant="coral" class="sm:flex-1" as-child>
          <RouterLink to="/app/predplatne">Zobrazit předplatné</RouterLink>
        </Button>
        <p v-else class="text-center text-sm text-muted-foreground sm:flex-1">
          O obnovení může požádat majitel nebo správce firmy.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
