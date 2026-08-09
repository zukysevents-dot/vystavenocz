#!/usr/bin/env node
// Audit modulové parity backend ↔ web ↔ mobil.
//
// Katalog modulů žije ve třech jazycích (C#, TypeScript, Kotlin) a sdílet zdrojový soubor mezi nimi
// nejde. Místo toho tenhle skript všechny tři seznamy PŘEČTE a porovná — rozdíl znamená, že jedna
// platforma zná modul, který druhá neumí bezpečně zpracovat (a tedy buď schová víc, nebo míň, než má).
//
// Spouští se z repozitáře vystavenocz; sourozenecké repozitáře hledá vedle něj. Chybějící sourozenec
// není chyba (např. CI, kde je naklonovaný jen web) — jen se přeskočí a je to vidět ve výstupu.
//
// Použití: npm run audit:modules

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspace = resolve(webRoot, '..')

const SOURCES = {
  backend: {
    path: resolve(workspace, 'vystaveno-api/src/Vystaveno.Domain/Authorization/ProductModules.cs'),
    // public const string Invoicing = "invoicing";
    extract: (src) => [...src.matchAll(/public const string \w+ = "([a-z_]+)";/g)].map((m) => m[1]),
  },
  web: {
    path: resolve(webRoot, 'src/lib/modules.ts'),
    extract: (src) => {
      const block = src.match(/export const APP_MODULES = \[([\s\S]*?)\] as const/)
      if (!block) throw new Error('APP_MODULES se v src/lib/modules.ts nenašlo')
      return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    },
  },
  mobile: {
    path: resolve(
      workspace,
      'vystaveno-mobile/composeApp/src/commonMain/kotlin/cz/vystaveno/mobile/core/auth/ModuleGates.kt',
    ),
    // Invoicing("invoicing"),
    extract: (src) => {
      const block = src.match(/enum class AppModule\(val wireId: String\) \{([\s\S]*?)\n\}/)
      if (!block) throw new Error('enum AppModule se v ModuleGates.kt nenašlo')
      return [...block[1].matchAll(/\("([a-z_]+)"\)/g)].map((m) => m[1])
    },
  },
}

const found = {}
const skipped = []
for (const [name, source] of Object.entries(SOURCES)) {
  if (!existsSync(source.path)) {
    skipped.push(name)
    continue
  }
  found[name] = source.extract(readFileSync(source.path, 'utf8'))
}

const problems = []
const names = Object.keys(found)
// Backend je zdroj pravdy: co nezná, nesmí existovat nikde jinde; co zná, musí umět zpracovat oba klienti.
const reference = found.backend ? 'backend' : names[0]

for (const name of names) {
  if (name === reference) continue
  const missing = found[reference].filter((m) => !found[name].includes(m))
  const extra = found[name].filter((m) => !found[reference].includes(m))
  if (missing.length) {
    problems.push(`${name} neumí modul(y) z ${reference}: ${missing.join(', ')}`)
  }
  if (extra.length) {
    problems.push(`${name} zná modul(y) navíc oproti ${reference}: ${extra.join(', ')}`)
  }
}

for (const name of names) {
  console.log(`${name.padEnd(8)} ${found[name].length} modulů: ${found[name].join(', ')}`)
}
if (skipped.length) console.log(`\nPřeskočeno (repozitář není vedle webu): ${skipped.join(', ')}`)

if (problems.length) {
  console.error('\nModulová parita ROZBITÁ:')
  for (const problem of problems) console.error(` - ${problem}`)
  console.error(
    '\nOprav katalog na chybějící straně a aktualizuj docs/product/web-mobile-module-parity.md.',
  )
  process.exit(1)
}

console.log('\nModulová parita v pořádku.')
