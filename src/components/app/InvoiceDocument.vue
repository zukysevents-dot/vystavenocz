<script setup lang="ts">
/**
 * Vizuální podoba faktury — živý náhled i (později) zdroj pro PDF (F6-48).
 * Renderuje na pevné šířce A4 (794px @ 96dpi), nezávisle na light/dark tématu appky.
 * Přeneseno ze staré React appky (Prod:src/components/app/InvoiceDocument.tsx).
 * QR platba (SPAYD) přijde s PDF taskem F6-48.
 */
import { computed, ref, watchEffect } from 'vue'
import QRCode from 'qrcode'
import {
  buildSpayd,
  calcLine,
  calcTotals,
  czAccountToIban,
  formatCZK,
  formatDate,
  variableSymbolFromInvoiceNumber,
} from '@/lib/invoice'
import type { ClientSnapshot, InvoiceItem, SupplierSnapshot } from '@/lib/types'

type DocItem = Pick<
  InvoiceItem,
  'id' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'vatRate'
>

const props = withDefaults(
  defineProps<{
    supplier: SupplierSnapshot
    client: ClientSnapshot
    items: DocItem[]
    invoiceNumber: string
    issueDate: string
    dueDate: string
    taxableDate: string
    variableSymbol?: string
    notes?: string | null
    paymentMethod?: string
    showVatBreakdown?: boolean
  }>(),
  {
    variableSymbol: '',
    notes: null,
    paymentMethod: 'bank_transfer',
    showVatBreakdown: true,
  },
)

const vatPayer = computed(() => props.supplier.vatMode === 'payer')
const totals = computed(() => calcTotals(props.items, vatPayer.value))
const vs = computed(
  () => props.variableSymbol || variableSymbolFromInvoiceNumber(props.invoiceNumber),
)
const accent = computed(() => props.supplier.invoiceColor || '#1f2937')
const iban = computed(
  () =>
    props.supplier.iban?.replace(/\s/g, '') ||
    (props.supplier.bankAccount ? czAccountToIban(props.supplier.bankAccount) : null),
)
const showPaymentBlock = computed(
  () => props.paymentMethod === 'bank_transfer' && !!(props.supplier.bankAccount || iban.value),
)

// QR platba (SPAYD) — jen u bankovního převodu s IBANem a kladnou částkou.
const qrDataUrl = ref<string | null>(null)
watchEffect(async () => {
  if (!iban.value || totals.value.total <= 0 || props.paymentMethod !== 'bank_transfer') {
    qrDataUrl.value = null
    return
  }
  const spayd = buildSpayd({
    iban: iban.value,
    amount: totals.value.total,
    variableSymbol: vs.value,
    message: props.invoiceNumber,
    swift: props.supplier.swift,
  })
  try {
    qrDataUrl.value = await QRCode.toDataURL(spayd, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: 'M',
    })
  } catch {
    qrDataUrl.value = null
  }
})

const metaCells = computed(() => [
  { label: 'Datum vystavení', value: formatDate(props.issueDate) },
  { label: vatPayer.value ? 'DUZP' : 'Datum plnění', value: formatDate(props.taxableDate) },
  { label: 'Datum splatnosti', value: formatDate(props.dueDate) },
  { label: 'Variabilní symbol', value: vs.value },
])

function lineTotal(it: DocItem): number {
  return calcLine(it, vatPayer.value).lineTotal
}
</script>

<template>
  <div class="invoice-doc" :style="{ '--accent': accent }">
    <!-- Hlavička -->
    <div class="doc-header">
      <div>
        <img v-if="supplier.logoUrl" :src="supplier.logoUrl" alt="logo" class="doc-logo" />
      </div>
      <div class="doc-header-right">
        <div class="doc-title">Faktura — daňový doklad</div>
        <div class="doc-number">{{ invoiceNumber }}</div>
      </div>
    </div>

    <!-- Dodavatel + Odběratel -->
    <div class="parties">
      <div>
        <div class="block-title">Dodavatel</div>
        <div class="block-body">
          <div class="party-name">{{ supplier.companyName || supplier.fullName || '—' }}</div>
          <div v-if="supplier.street">{{ supplier.street }}</div>
          <div v-if="supplier.zip || supplier.city">{{ supplier.zip }} {{ supplier.city }}</div>
          <div v-if="supplier.country && supplier.country !== 'CZ'">{{ supplier.country }}</div>
          <div class="party-ids">
            <div v-if="supplier.ico">
              IČO: <strong>{{ supplier.ico }}</strong>
            </div>
            <div v-if="supplier.dic">
              DIČ: <strong>{{ supplier.dic }}</strong>
            </div>
            <div v-if="!vatPayer" class="muted-note">
              {{ supplier.vatMode === 'identified' ? 'Identifikovaná osoba' : 'Neplátce DPH' }}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="block-title">Odběratel</div>
        <div class="block-body">
          <div class="party-name">{{ client.name || '—' }}</div>
          <div v-if="client.street">{{ client.street }}</div>
          <div v-if="client.zip || client.city">{{ client.zip }} {{ client.city }}</div>
          <div v-if="client.country && client.country !== 'CZ'">{{ client.country }}</div>
          <div class="party-ids">
            <div v-if="client.ico">
              IČO: <strong>{{ client.ico }}</strong>
            </div>
            <div v-if="client.dic">
              DIČ: <strong>{{ client.dic }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Meta info -->
    <div class="meta">
      <div v-for="c in metaCells" :key="c.label">
        <div class="meta-label">{{ c.label }}</div>
        <div class="meta-value">{{ c.value }}</div>
      </div>
    </div>

    <!-- Položky -->
    <table class="items">
      <thead>
        <tr>
          <th>Popis</th>
          <th class="num" style="width: 60px">Množ.</th>
          <th style="width: 50px">MJ</th>
          <th class="num" style="width: 90px">Cena/MJ</th>
          <th v-if="vatPayer" class="num" style="width: 60px">DPH</th>
          <th class="num" style="width: 110px">{{ vatPayer ? 'Celkem s DPH' : 'Celkem' }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td class="empty-items" :colspan="vatPayer ? 6 : 5">Zatím žádné položky</td>
        </tr>
        <tr v-for="it in items" :key="it.id">
          <td>{{ it.description || '—' }}</td>
          <td class="num">{{ it.quantity }}</td>
          <td>{{ it.unit }}</td>
          <td class="num">{{ formatCZK(it.unitPrice) }}</td>
          <td v-if="vatPayer" class="num">{{ it.vatRate }} %</td>
          <td class="num total">{{ formatCZK(lineTotal(it)) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Souhrn -->
    <div class="summary">
      <div>
        <template v-if="showPaymentBlock">
          <div class="block-title">Platební údaje</div>
          <div class="block-body">
            <div v-if="supplier.bankAccount">
              Číslo účtu: <strong>{{ supplier.bankAccount }}</strong>
            </div>
            <div v-if="iban">
              IBAN: <strong>{{ iban }}</strong>
            </div>
            <div v-if="supplier.swift">
              SWIFT: <strong>{{ supplier.swift }}</strong>
            </div>
            <div>
              VS: <strong>{{ vs }}</strong>
            </div>
            <div class="muted-note">Způsob úhrady: bankovní převod</div>
          </div>
        </template>
        <div v-if="qrDataUrl" class="qr">
          <div class="qr-label">QR platba</div>
          <img :src="qrDataUrl" alt="QR platba" class="qr-img" />
        </div>
      </div>

      <div class="totals">
        <template v-if="vatPayer">
          <div class="row">
            <span>Základ daně</span><span>{{ formatCZK(totals.subtotal) }}</span>
          </div>
          <template v-if="showVatBreakdown">
            <div v-for="(b, rate) in totals.vatBreakdown" :key="rate" class="row">
              <span>DPH {{ rate }} % z {{ formatCZK(b.base) }}</span>
              <span>{{ formatCZK(b.vat) }}</span>
            </div>
          </template>
          <div class="row">
            <span>DPH celkem</span><span>{{ formatCZK(totals.vatTotal) }}</span>
          </div>
          <div class="row-total">
            <div class="row">
              <span>K úhradě</span><span>{{ formatCZK(totals.total) }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="row">
            <span>Mezisoučet</span><span>{{ formatCZK(totals.subtotal) }}</span>
          </div>
          <div class="row-total">
            <div class="row">
              <span>K úhradě</span><span>{{ formatCZK(totals.total) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="notes" class="notes">{{ notes }}</div>

    <div class="footer">Vystaveno v aplikaci Vystaveno · vystaveno.cz</div>
  </div>
</template>

<style scoped>
.invoice-doc {
  width: 794px;
  min-height: 1123px;
  margin: 0 auto;
  padding: 48px;
  background: #fff;
  color: #0f172a;
  font-family: Inter, system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  position: relative;
}
.doc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 3px solid var(--accent);
  padding-bottom: 16px;
}
.doc-logo {
  max-height: 56px;
  max-width: 180px;
  object-fit: contain;
}
.doc-header-right {
  text-align: right;
}
.doc-title {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.doc-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  margin-top: 4px;
}
.parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 24px;
}
.block-title {
  font-size: 10px;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 6px;
}
.block-body {
  color: #334155;
}
.block-body strong {
  color: #0f172a;
}
.party-name {
  font-weight: 600;
  font-size: 13px;
}
.party-ids {
  margin-top: 8px;
}
.muted-note {
  color: #64748b;
  font-size: 11px;
  margin-top: 4px;
}
.meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 24px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}
.meta-label {
  font-size: 9.5px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.meta-value {
  font-weight: 600;
  margin-top: 2px;
}
.items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
  font-size: 11.5px;
}
.items thead tr {
  background: var(--accent);
  color: #fff;
}
.items th {
  padding: 8px 10px;
  text-align: left;
}
.items td {
  padding: 10px;
  border-bottom: 1px solid #e2e8f0;
}
.items .num {
  text-align: right;
}
.items td.total {
  font-weight: 600;
}
.empty-items {
  text-align: center;
  color: #94a3b8;
  padding: 16px;
}
.summary {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 32px;
  margin-top: 24px;
}
.totals {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: #334155;
}
.row-total {
  border-top: 2px solid #cbd5e1;
  margin-top: 8px;
  padding-top: 8px;
}
.row-total .row {
  font-weight: 700;
  font-size: 14px;
  color: var(--accent);
}
.qr {
  margin-top: 16px;
}
.qr-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.qr-img {
  width: 140px;
  height: 140px;
}
.notes {
  margin-top: 24px;
  padding: 12px;
  border-left: 3px solid var(--accent);
  background: #f8fafc;
  font-size: 11.5px;
}
.footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
}
</style>
