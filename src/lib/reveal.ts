import type { Directive } from 'vue'

/**
 * v-reveal — scroll-reveal pro landing sekce (třídy .reveal-init/.reveal-in v main.css).
 * Obsah schovává až JS po mountu, takže bez JS ani při prefers-reduced-motion se nic
 * neskryje. Odkrývá jednou při vstupu do viewportu; volitelný stagger přes { delay }.
 * Elementy přeskočené rychlým skokem (End, kotva, PageDown) odkryje sweep při scrollu,
 * aby na stránce nikdy nezůstal trvale neviditelný obsah.
 */
type RevealOptions = { delay?: number }

const observers = new WeakMap<HTMLElement, IntersectionObserver>()
const pending = new Set<HTMLElement>()
let sweepBound = false
let sweepScheduled = false

function show(el: HTMLElement, delay: number) {
  el.classList.add('reveal-in')
  observers.get(el)?.disconnect()
  observers.delete(el)
  pending.delete(el)
  // Po dojetí přechodu třídy sundat — jinak by unlayered `transform: none`
  // přebíjel hover utility (např. hover:-translate-y-0.5) na kartách.
  window.setTimeout(() => {
    el.classList.remove('reveal-init', 'reveal-in')
    el.style.removeProperty('--reveal-delay')
  }, delay + 800)
}

/* Elementy, které rychlý skok přenesl nad viewport, odkrýt bez čekání na průnik. */
function sweepAboveViewport() {
  sweepScheduled = false
  for (const el of pending) {
    if (el.getBoundingClientRect().bottom < 0) {
      el.style.setProperty('--reveal-delay', '0ms')
      show(el, 0)
    }
  }
}

function onScroll() {
  if (sweepScheduled || pending.size === 0) return
  sweepScheduled = true
  window.requestAnimationFrame(sweepAboveViewport)
}

export const vReveal: Directive<HTMLElement, RevealOptions | undefined> = {
  mounted(el, binding) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const delay = binding.value?.delay ?? 0
    if (delay > 0) el.style.setProperty('--reveal-delay', `${delay}ms`)
    el.classList.add('reveal-init')

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // bottom < 0: element už je nad viewportem (stránka načtená uprostřed) → rovnou odkrýt.
          if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
            show(el, delay)
            return
          }
        }
      },
      // threshold 0 + záporný spodní margin: odkryje, jakmile horní hrana protne
      // ~90 % výšky viewportu — funguje i pro sekce vyšší než obrazovka.
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    observers.set(el, io)
    pending.add(el)
    if (!sweepBound) {
      sweepBound = true
      window.addEventListener('scroll', onScroll, { passive: true })
    }
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
    pending.delete(el)
  },
}
