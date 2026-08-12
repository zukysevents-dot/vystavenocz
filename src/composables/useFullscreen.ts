import { onMounted, onUnmounted, readonly, ref } from 'vue'

/**
 * Celá obrazovka přes nativní Fullscreen API — na tabletu za barem schová adresní řádek
 * a systémové lišty, takže se na účet vejde víc řádků a obsluha nezavadí o UI prohlížeče.
 *
 * `supported` je fail-closed: Safari na iPhonu/iPadu umí fullscreen jen pro <video>, ne pro
 * libovolný prvek. Tlačítko se tam proto vůbec nezobrazí — radši ho neukázat než nabídnout
 * akci, která tiše nic neudělá. Na iOS je cesta „Přidat na plochu" (PWA běží bez lišt sama).
 *
 * Stav se čte z `document.fullscreenElement`, ne z vlastní proměnné: uživatel může odejít
 * Escapem nebo systémovým gestem a ikona by pak lhala.
 */
export function useFullscreen() {
  const isFullscreen = ref(false)
  const supported = ref(false)

  function sync() {
    isFullscreen.value = document.fullscreenElement !== null
  }

  async function toggle(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Prohlížeč může požadavek odmítnout (mimo gesto uživatele, zákaz v iframe).
      // Není co hlásit — stav se dorovná z `fullscreenchange`.
    }
    sync()
  }

  onMounted(() => {
    supported.value = document.fullscreenEnabled === true
    sync()
    document.addEventListener('fullscreenchange', sync)
  })
  onUnmounted(() => document.removeEventListener('fullscreenchange', sync))

  return { isFullscreen: readonly(isFullscreen), supported: readonly(supported), toggle }
}
