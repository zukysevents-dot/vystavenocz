<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DEMO_MAILTO } from '@/lib/landing-cta'

// Sticky CTA ve spodní části obrazovky — jen na mobilu. Objeví se po ~400px scrollu,
// aby nepřekáželo v hero sekci, a drží CTA „Chci demo" vždy po ruce.
const visible = ref(false)

function onScroll() {
  visible.value = window.scrollY > 400
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden"
    :class="visible ? 'translate-y-0' : 'translate-y-full'"
    :aria-hidden="!visible"
  >
    <Button variant="coral" size="lg" class="group w-full text-base" as-child>
      <a :href="DEMO_MAILTO">
        Chci demo zdarma
        <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
      </a>
    </Button>
    <p class="mt-1.5 text-center text-[11px] text-muted-foreground">
      Bez závazku · odpovídáme do 24 hodin
    </p>
  </div>
</template>
