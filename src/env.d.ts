// Typování veřejných Vite env proměnných (rozšiřuje vite/client).
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
