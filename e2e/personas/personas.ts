import fs from 'node:fs'
import path from 'node:path'

// Definice person: role v demo firmě + e-mail testovacího účtu.
// Hesla NIKDY v kódu — jen env (E2E_PERSONA_PASSWORD, viz .env.e2e / .env.example).
// Účty vznikají idempotentně v personas.setup.ts přes pozvánkový flow reálného API.

export interface Persona {
  /** Klíč = název souboru storageState i prefix e-mailu. */
  key: string
  displayName: string
  /** CompanyRole wire hodnota (enum jako string). null = demo owner účet (nezakládá se). */
  role: 'Manager' | 'Accountant' | 'Employee' | 'Kitchen' | 'Stockkeeper' | null
  /** Klíč demo pobočky pro location scope (název z DemoDataSeeder), jinak unrestricted. */
  locationName?: string
}

export const PERSONAS: Record<string, Persona> = {
  majitel: { key: 'majitel', displayName: 'Demo Admin', role: null },
  sklad: { key: 'sklad', displayName: 'Skladník Standa', role: 'Stockkeeper' },
  sluzby: { key: 'sluzby', displayName: 'Kadeřnice Katka', role: 'Manager' },
  cisnik: { key: 'cisnik', displayName: 'Číšník Čenda', role: 'Employee' },
  kuchar: { key: 'kuchar', displayName: 'Kuchař Karel', role: 'Kitchen' },
  manazer: {
    key: 'manazer',
    displayName: 'Manažerka Marie',
    role: 'Manager',
    locationName: 'Centrum',
  },
  ucetni: { key: 'ucetni', displayName: 'Účetní Uršula', role: 'Accountant' },
}

export function personaEmail(p: Persona): string {
  if (p.role === null) {
    const email = process.env.E2E_DEMO_EMAIL
    if (!email) throw new Error('Chybí E2E_DEMO_EMAIL v prostředí (viz .env.example).')
    return email
  }
  return `e2e.${p.key}@vystaveno-demo.cz`
}

export function personaPassword(p: Persona): string {
  const key = p.role === null ? 'E2E_DEMO_PASSWORD' : 'E2E_PERSONA_PASSWORD'
  const password = process.env[key]
  if (!password) throw new Error(`Chybí ${key} v prostředí (viz .env.example).`)
  return password
}

const AUTH_DIR = path.join(import.meta.dirname, '.auth')

export function authFile(key: string): string {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  return path.join(AUTH_DIR, `${key}.json`)
}

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5176/api/v1'
