<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Maximize, Minimize } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useFullscreen } from '@/composables/useFullscreen'

// `class` se propouští do Buttonu (merguje ho `cn`) — provozní cockpit potřebuje dotykových 48 px,
// v sidebaru stačí běžná ikonová velikost.
const props = defineProps<{ class?: HTMLAttributes['class'] }>()

const { isFullscreen, supported, toggle } = useFullscreen()
</script>

<template>
  <!-- Bez podpory (Safari na iOS/iPadu) tlačítko nezobrazujeme — nesmí nabízet akci, která nic neudělá. -->
  <Button
    v-if="supported"
    variant="ghost"
    size="icon"
    :class="props.class"
    :aria-label="isFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'"
    :title="isFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'"
    @click="toggle"
  >
    <Minimize v-if="isFullscreen" />
    <Maximize v-else />
  </Button>
</template>
