import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // PWA: manifest už je v public/manifest.json (F0-10) — plugin generuje jen
    // service worker (precache app shellu) a injektuje jeho registraci.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html}', 'favicon.ico', 'icon-192.png', 'icon-512.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Vite 8 může zavolat PWA closeBundle ještě před zapsáním precache assetů. Runtime fallback
        // zároveň udrží navigaci funkční a zabrání tomu, aby Workbox odmítl celý produkční build.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'vystaveno-pages' },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
