import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore, type Theme } from '@/stores/ui'

// Téma light/dark. Stav drží ui store (F0-05), persistence + DOM třída zde.
// Převedeno ze staré React appky (ThemeContext.tsx + ThemeToggle.tsx).
const STORAGE_KEY = 'vystaveno:theme'
let initialized = false

function detectInitial(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useTheme() {
  const store = useUiStore()
  const { theme } = storeToRefs(store)

  if (!initialized) {
    initialized = true
    store.theme = detectInitial()
    applyTheme(store.theme)
    watch(
      () => store.theme,
      (t) => {
        applyTheme(t)
        localStorage.setItem(STORAGE_KEY, t)
      },
    )
  }

  function toggleTheme(): void {
    store.theme = store.theme === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme): void {
    store.theme = value
  }

  return { theme, toggleTheme, setTheme }
}
