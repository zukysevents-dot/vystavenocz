import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, nextTick } from 'vue'
import { useFullscreen } from '@/composables/useFullscreen'

// jsdom Fullscreen API neimplementuje — dosadíme vlastní, ať se dá otestovat naše logika.
function stubFullscreen(opts: { enabled: boolean }) {
  let element: Element | null = null
  const request = vi.fn(async () => {
    element = document.documentElement
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  const exit = vi.fn(async () => {
    element = null
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  Object.defineProperty(document, 'fullscreenEnabled', { value: opts.enabled, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', {
    get: () => element,
    configurable: true,
  })
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: request,
    configurable: true,
  })
  Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true })
  return { request, exit, setElement: (el: Element | null) => (element = el) }
}

/** Composable potřebuje onMounted/onUnmounted → musí běžet uvnitř komponenty (bez test-utils, stačí createApp). */
function mountComposable() {
  const state: { api?: ReturnType<typeof useFullscreen> } = {}
  const app = createApp(
    defineComponent({
      setup() {
        state.api = useFullscreen()
        return () => null
      },
    }),
  )
  app.mount(document.createElement('div'))
  return { unmount: () => app.unmount(), api: state.api! }
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('useFullscreen', () => {
  it('bez podpory prohlížeče se tlačítko nemá zobrazit', () => {
    // Safari na iOS umí fullscreen jen pro <video> — nabízet tam akci, která nic neudělá, je horší než ji skrýt.
    stubFullscreen({ enabled: false })
    const { api } = mountComposable()
    expect(api.supported.value).toBe(false)
  })

  it('zapne celou obrazovku a stav se propíše do ikony', async () => {
    const fs = stubFullscreen({ enabled: true })
    const { api } = mountComposable()
    expect(api.supported.value).toBe(true)
    expect(api.isFullscreen.value).toBe(false)

    await api.toggle()

    expect(fs.request).toHaveBeenCalledOnce()
    expect(api.isFullscreen.value).toBe(true)
  })

  it('druhé klepnutí celou obrazovku ukončí', async () => {
    const fs = stubFullscreen({ enabled: true })
    const { api } = mountComposable()

    await api.toggle()
    await api.toggle()

    expect(fs.exit).toHaveBeenCalledOnce()
    expect(api.isFullscreen.value).toBe(false)
  })

  it('odchod Escapem stav dorovná, ikona nelže', async () => {
    // Uživatel může fullscreen opustit i mimo naše tlačítko — stav proto čteme z dokumentu, ne z vlastní proměnné.
    const fs = stubFullscreen({ enabled: true })
    const { api } = mountComposable()
    await api.toggle()
    expect(api.isFullscreen.value).toBe(true)

    fs.setElement(null)
    document.dispatchEvent(new Event('fullscreenchange'))
    await nextTick()

    expect(api.isFullscreen.value).toBe(false)
  })

  it('odmítnutý požadavek nespadne a nechá stav pravdivý', async () => {
    stubFullscreen({ enabled: true })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockRejectedValue(new TypeError('Permissions check failed')),
      configurable: true,
    })
    const { api } = mountComposable()

    await expect(api.toggle()).resolves.toBeUndefined()
    expect(api.isFullscreen.value).toBe(false)
  })

  it('po odpojení komponenty se posluchač uklidí', async () => {
    stubFullscreen({ enabled: true })
    const spy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = mountComposable()

    unmount()

    expect(spy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
  })
})
