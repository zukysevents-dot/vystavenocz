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

// MVP: demo data do mock vrstvy (idempotentní) — jen v mock režimu. Na reálném API se neseeduje.
if (!isApiMode()) void seedMockData()

const app = createApp(App)

// Sledování chyb přes Sentry (aktivní jen když je nastaven VITE_SENTRY_DSN).
const sentryDsn = (import.meta.env as Record<string, string | undefined>).VITE_SENTRY_DSN
Sentry.init({
  app,
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  tracesSampleRate: 0,
})

app.use(createPinia()).use(router).use(createHead()).mount('#app')
