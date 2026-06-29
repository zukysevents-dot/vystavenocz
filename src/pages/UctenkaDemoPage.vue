<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SaleReceipt from '@/components/SaleReceipt.vue'
import type { ReceiptLine } from '@/components/SaleReceipt.vue'

// Ukázková data (kavárna) — slouží k náhledu designu účtenky.
const items: ReceiptLine[] = [
  { qty: 2, name: 'Espresso', total: 98 },
  { qty: 1, name: 'Cheesecake', total: 129 },
  { qty: 1, name: 'Flat white', total: 65 },
  { qty: 1, name: 'Croissant', total: 68.9 },
]

function print() {
  window.print()
}
</script>

<template>
  <div class="flex min-h-svh flex-col items-center gap-6 bg-surface-soft px-4 py-12">
    <div class="text-center">
      <h1 class="font-display text-2xl font-black tracking-tight">Účtenka — náhled</h1>
      <p class="mt-1 text-sm text-muted-foreground">Termo 80 mm · JetBrains Mono · halftone aura</p>
    </div>

    <div class="shadow-card">
      <SaleReceipt
        business-name="Kavárna Spolek"
        business-note="Výběrová káva & dezerty"
        address="Dlouhá 12, Praha 1"
        ico="12345678"
        receipt-number="2026-000142"
        date-time="26. 6. 2026 14:32"
        table="7"
        cashier="Petra"
        :items="items"
        :subtotal="322.23"
        :vat-lines="[{ rate: 12, base: 322.23, vat: 38.67 }]"
        :total="360.9"
        payment-method="Kartou"
      />
    </div>

    <Button variant="coral" @click="print"><Printer class="h-4 w-4" /> Vytisknout / PDF</Button>
  </div>
</template>
