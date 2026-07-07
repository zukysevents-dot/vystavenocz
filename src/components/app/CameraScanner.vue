<script setup lang="ts">
// Skenování čárových kódů (EAN/UPC) mobilní kamerou přes @zxing/browser.
// Knihovna se lazy-importuje až při otevření — nezatěžuje hlavní bundle.
// Skenuje průběžně: personál může naskenovat víc položek za sebou.
import { ref, nextTick, watch, onBeforeUnmount } from 'vue'
import { CameraOff, Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const props = withDefaults(defineProps<{ open: boolean; description?: string }>(), {
  description: 'Namiř čárový kód na kameru — položka se přidá na příjemku automaticky.',
})
const emit = defineEmits<{ 'update:open': [boolean]; detected: [string] }>()

const video = ref<HTMLVideoElement | null>(null)
const starting = ref(false)
const error = ref('')

let controls: { stop: () => void } | null = null
// Generace: každé stop() (zavření/unmount) invaliduje probíhající start(),
// aby rychlé open→close→open nenechalo běžet osiřelý stream (svítící kamera).
let generation = 0
let lastCode = ''
let lastAt = 0

function onResult(code: string) {
  const now = Date.now()
  // Stejný kód z několika snímků po sobě (držená položka) → počítej jen jednou.
  if (code === lastCode && now - lastAt < 2000) return
  lastCode = code
  lastAt = now
  emit('detected', code)
}

async function start() {
  const gen = ++generation
  starting.value = true
  error.value = ''
  try {
    const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ])
    // Mezitím se mohlo zavřít / znovu otevřít, nebo video ještě není v DOM.
    if (gen !== generation || !video.value) return
    const el = video.value
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ])
    const reader = new BrowserMultiFormatReader(hints)
    const active = await reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      el,
      (result) => {
        if (result) onResult(result.getText())
      },
    )
    // Zavřeno během startu kamery → hned uvolni stream, ať nezůstane svítit.
    if (gen !== generation) {
      active.stop()
      return
    }
    controls = active
  } catch (e) {
    if (gen !== generation) return
    error.value =
      e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'NotFoundError')
        ? 'Přístup ke kameře byl odmítnut nebo kamera není dostupná. Použij HW čtečku nebo ruční zadání.'
        : 'Kameru se nepodařilo spustit. Použij HW čtečku nebo ruční zadání.'
  } finally {
    if (gen === generation) starting.value = false
  }
}

function stop() {
  generation++ // invaliduje probíhající start()
  controls?.stop()
  controls = null
  starting.value = false
  error.value = ''
  lastCode = ''
  lastAt = 0
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      start()
    } else {
      stop()
    }
  },
)
onBeforeUnmount(stop)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Skenovat kamerou</DialogTitle>
        <DialogDescription>
          {{ props.description }}
        </DialogDescription>
      </DialogHeader>

      <div class="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        <video ref="video" class="h-full w-full object-cover" muted autoplay playsinline></video>

        <!-- Zaměřovací rámeček -->
        <div
          v-if="!error && !starting"
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div class="h-24 w-3/4 rounded-lg border-2 border-white/80"></div>
        </div>

        <div v-if="starting" class="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>

        <div
          v-if="error"
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white"
        >
          <CameraOff class="h-8 w-8" />
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
