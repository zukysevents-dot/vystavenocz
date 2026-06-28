// Node 25 zapíná experimentální WebStorage, který v jsdom běhu (vitest 4) přebije
// jsdom `localStorage` a nemá funkční `clear()` → testy s localStorage padaly.
// Dáme testům deterministickou in-memory localStorage, resetovanou před každým testem.
import { beforeEach } from 'vitest'

const store = new Map<string, string>()
const localStorageMock = {
  get length() {
    return store.size
  },
  clear: () => store.clear(),
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  key: (i: number) => [...store.keys()][i] ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

beforeEach(() => store.clear())
