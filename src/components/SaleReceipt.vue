<script setup lang="ts">
// Tisková účtenka (termo 80 mm) v identitě Vystaveno — vždy „papír" (bílá/černá), nezávislá na
// tmavém režimu appky, tisknutelná přes window.print() (viz .receipt-printable v main.css).
export interface ReceiptLine {
  name: string
  qty: number
  total: number
}
export interface ReceiptVatLine {
  rate: number
  base: number
  vat: number
}

withDefaults(
  defineProps<{
    businessName: string
    businessNote?: string
    address?: string
    ico?: string
    dic?: string
    receiptNumber: string
    dateTime: string
    table?: string
    cashier?: string
    items: ReceiptLine[]
    subtotal?: number
    vatLines?: ReceiptVatLine[]
    total: number
    paymentMethod: string
    footer?: string
  }>(),
  { footer: 'Děkujeme za návštěvu' },
)

const money = (n: number) =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>

<template>
  <div
    class="receipt-printable mx-auto w-[80mm] max-w-full bg-white px-5 py-6 font-mono text-[11px] leading-relaxed text-zinc-900"
  >
    <!-- Halftone aura orb (monochrom — tiskne se na termo tiskárně). -->
    <div class="flex justify-center">
      <svg viewBox="0 0 120 120" class="h-16 w-16" aria-hidden="true">
        <defs>
          <radialGradient id="receiptOrb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#000" stop-opacity="0.12" />
            <stop offset="44%" stop-color="#000" stop-opacity="0.22" />
            <stop offset="62%" stop-color="#000" stop-opacity="0.92" />
            <stop offset="80%" stop-color="#000" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#000" stop-opacity="0" />
          </radialGradient>
          <pattern id="receiptDots" width="4.2" height="4.2" patternUnits="userSpaceOnUse">
            <circle cx="2.1" cy="2.1" r="1.35" fill="#fff" />
          </pattern>
          <mask id="receiptDotMask">
            <rect width="120" height="120" fill="#000" />
            <circle cx="60" cy="60" r="58" fill="url(#receiptDots)" />
          </mask>
        </defs>
        <circle cx="60" cy="60" r="58" fill="url(#receiptOrb)" mask="url(#receiptDotMask)" />
      </svg>
    </div>

    <!-- Hlavička -->
    <div class="mt-3 text-center">
      <h2 class="text-lg font-bold uppercase leading-tight tracking-[0.12em]">
        {{ businessName }}
      </h2>
      <p v-if="businessNote" class="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {{ businessNote }}
      </p>
      <p v-if="address" class="mt-1.5 text-[10px] text-zinc-600">{{ address }}</p>
      <p v-if="ico || dic" class="text-[10px] text-zinc-600">
        <span v-if="ico">IČO {{ ico }}</span>
        <span v-if="ico && dic"> · </span>
        <span v-if="dic">DIČ {{ dic }}</span>
      </p>
    </div>

    <div class="my-3 text-center text-[10px] tracking-[0.3em] text-zinc-400">✻ ✻ ✻ ✻ ✻ ✻ ✻ ✻ ✻</div>

    <!-- Meta -->
    <div class="space-y-0.5 text-[10px] text-zinc-700">
      <div class="flex justify-between">
        <span>Účtenka</span><span>{{ receiptNumber }}</span>
      </div>
      <div class="flex justify-between">
        <span>Datum</span><span>{{ dateTime }}</span>
      </div>
      <div v-if="table" class="flex justify-between">
        <span>Stůl</span><span>{{ table }}</span>
      </div>
      <div v-if="cashier" class="flex justify-between">
        <span>Obsluha</span><span>{{ cashier }}</span>
      </div>
    </div>

    <div
      class="mt-3 border-t border-dashed border-zinc-400 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
    >
      Položky
    </div>

    <!-- Položky s tečkovanými vodicími linkami -->
    <ul class="mt-1.5 space-y-1.5">
      <li v-for="(it, i) in items" :key="i" class="flex items-baseline gap-1">
        <span class="shrink-0">{{ it.qty }}× {{ it.name }}</span>
        <span class="mb-[3px] flex-1 border-b border-dotted border-zinc-300" aria-hidden="true" />
        <span class="shrink-0 tabular-nums">{{ money(it.total) }}</span>
      </li>
    </ul>

    <!-- Součty -->
    <div class="mt-3 space-y-0.5 border-t border-dashed border-zinc-400 pt-2 text-zinc-700">
      <div v-if="subtotal != null" class="flex justify-between">
        <span>Mezisoučet</span><span class="tabular-nums">{{ money(subtotal) }} Kč</span>
      </div>
      <div
        v-for="v in vatLines"
        :key="v.rate"
        class="flex justify-between text-[10px] text-zinc-500"
      >
        <span>DPH {{ v.rate }} % ze {{ money(v.base) }}</span>
        <span class="tabular-nums">{{ money(v.vat) }} Kč</span>
      </div>
    </div>

    <div class="mt-2 flex items-end justify-between border-t-2 border-zinc-900 pt-2">
      <span class="text-sm font-bold uppercase tracking-[0.12em]">Celkem</span>
      <span class="text-2xl font-bold tabular-nums">{{ money(total) }} Kč</span>
    </div>

    <div class="mt-2 flex justify-between text-[10px] text-zinc-700">
      <span>Platba</span><span>{{ paymentMethod }}</span>
    </div>

    <div class="my-3 text-center text-[10px] tracking-[0.3em] text-zinc-400">✻ ✻ ✻ ✻ ✻ ✻ ✻ ✻ ✻</div>

    <p class="text-center text-[11px] font-semibold uppercase tracking-[0.15em]">{{ footer }}</p>
    <p class="mt-1 text-center text-[9px] uppercase tracking-[0.3em] text-zinc-400">vystaveno.cz</p>
  </div>
</template>
