import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import { createHead } from '@unhead/vue/client'
// Mono (JetBrains Mono) na částky/doklady/kódy. Cabinet Grotesk je self-hostovaný v main.css (@font-face).
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@/assets/main.css'
import App from '@/App.vue'
import router from '@/router'
import { seedMockData } from '@/lib/seed'
import { isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

// MVP: demo data do mock vrstvy (idempotentní) — jen v mock režimu. Na reálném API se neseeduje.
if (!isApiMode()) void seedMockData()

const app = createApp(App)
const pinia = createPinia()

// Pokud backend po neúspěšném refreshi odmítne starou relaci (např. účet byl resetován),
// nenecháme obrazovku čekat na data, která už nelze načíst.
window.addEventListener('vystaveno:unauthorized', () => {
  useAuthStore(pinia).clearInvalidSession()
  void router.replace({ name: 'prihlaseni' })
})

// Sledování chyb přes Sentry (aktivní jen když je nastaven VITE_SENTRY_DSN).
const sentryDsn = (import.meta.env as Record<string, string | undefined>).VITE_SENTRY_DSN
Sentry.init({
  app,
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  tracesSampleRate: 0,
  // ApiError nese celé tělo backend odpovědi (detail) — do error trackingu nepatří (může obsahovat citlivá data).
  beforeSend(event) {
    delete event.extra
    return event
  },
})

app.use(pinia).use(router).use(createHead()).mount('#app')
