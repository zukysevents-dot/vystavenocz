import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import { createHead } from '@unhead/vue/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/assets/main.css'
import App from '@/App.vue'
import router from '@/router'
import { seedMockData } from '@/lib/seed'

// MVP: naseedovat demo data do mock vrstvy (idempotentní). Odstraní se po napojení API.
void seedMockData()

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
