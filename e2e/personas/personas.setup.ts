import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { test as setup, expect, request, type APIRequestContext } from '@playwright/test'
import { API_URL, PERSONAS, authFile, personaEmail, personaPassword } from './personas'
import { dismissCookies } from '../audit/helpers'

// Idempotentní příprava persona účtů přes REÁLNÉ API (pozvánkový flow):
//   1) login demo Ownera → JWT,
//   2) POST /company/invitations {email, role, locationId},
//   3) POST /invitations/{token}/accept {password, displayName} → účet + členství,
//   4) UI přihlášení každé persony → storageState do e2e/personas/.auth/ (gitignored).
//
// POZOR (nález auditu): bez SMTP vrací create pozvánky 503 (fail-closed e-mail), ale pozvánka
// se commitne PŘED odesláním → raw token se ztratí a Pending pozvánka blokuje další pokus (409).
// Workaround jen pro lokální e2e: Pending pozvánce nastavíme známý token_hash přímo v e2e DB
// (docker exec psql) a přijmeme ji přes reálný accept endpoint. Hesla jen z env.
// Nad sdíleným stagingem tento setup NEspouštět.

setup.describe.configure({ mode: 'serial' }) // nejdřív účty, pak přihlášení

const PG_CONTAINER = process.env.E2E_PG_CONTAINER ?? 'vystaveno-dev-pg'
const PG_DB = process.env.E2E_PG_DB ?? 'vystaveno_e2e'

function sql(query: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', PG_CONTAINER, 'psql', '-U', 'postgres', '-d', PG_DB, '-tAc', query],
    { encoding: 'utf8' },
  ).trim()
}

async function ownerToken(api: APIRequestContext): Promise<string> {
  const owner = PERSONAS.majitel
  const res = await api.post(`${API_URL}/auth/login`, {
    data: { email: personaEmail(owner), password: personaPassword(owner) },
  })
  expect(res.status(), 'login demo Ownera (běží backend + proběhl seed-demo?)').toBe(200)
  const body = await res.json()
  expect(body.accessToken, 'accessToken v odpovědi loginu').toBeTruthy()
  return body.accessToken as string
}

setup('založení persona účtů přes API', async () => {
  const api = await request.newContext()
  const token = await ownerToken(api)
  const auth = { Authorization: `Bearer ${token}` }

  const members = await api.get(`${API_URL}/company/members?pageSize=100`, { headers: auth })
  expect(members.status()).toBe(200)
  const memberEmails = new Set(
    ((await members.json()).items ?? []).map((m: { email: string | null }) => m.email),
  )

  const locRes = await api.get(`${API_URL}/locations`, { headers: auth })
  expect(locRes.status()).toBe(200)
  const locBody = await locRes.json()
  const locations: Array<{ id: string; name: string }> = locBody.items ?? locBody

  for (const persona of Object.values(PERSONAS)) {
    if (persona.role === null) continue // demo owner existuje ze seedu
    const email = personaEmail(persona)
    if (memberEmails.has(email)) continue // rerun — účet už je členem

    const locationId = persona.locationName
      ? locations.find((l) => l.name === persona.locationName)?.id
      : undefined
    if (persona.locationName) expect(locationId, `pobočka ${persona.locationName}`).toBeTruthy()

    // Create může vrátit 201 (SMTP ok), 503 (bez SMTP — pozvánka je i tak založená, token ztracen)
    // nebo 409 (Pending pozvánka z minulého běhu). Pro 503/409 doplníme známý token přímo v e2e DB.
    const invite = await api.post(`${API_URL}/company/invitations`, {
      headers: auth,
      data: { email, role: persona.role, locationId: locationId ?? null },
    })
    let inviteToken: string
    if (invite.status() === 201) {
      inviteToken = (await invite.json()).token
    } else {
      expect([409, 503], `pozvánka pro ${email} (status ${invite.status()})`).toContain(
        invite.status(),
      )
      inviteToken = randomBytes(32).toString('base64url')
      const hash = createHash('sha256').update(inviteToken, 'utf8').digest('base64')
      const updated = sql(
        `UPDATE invitations SET token_hash = '${hash}' WHERE email = '${email}' AND status = 'Pending' RETURNING id`,
      )
      expect(updated, `Pending pozvánka pro ${email} v DB`).not.toBe('')
    }

    const accept = await api.post(`${API_URL}/invitations/${inviteToken}/accept`, {
      data: { password: personaPassword(persona), displayName: persona.displayName },
    })
    expect(accept.status(), `přijetí pozvánky ${email}`).toBe(200)
  }
  await api.dispose()
})

// UI login každé persony → sdílený storageState. Ověřuje zároveň, že se každá role vůbec přihlásí.
// Čerstvý storageState (< 30 min) se recykluje — opakované běhy jinak narazí na rate limit /auth/login.
import fs from 'node:fs'

for (const persona of Object.values(PERSONAS)) {
  setup(`přihlášení: ${persona.key}`, async ({ page }) => {
    const file = authFile(persona.key)
    if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 30 * 60_000) {
      setup.skip(true, 'storageState je čerstvý — přeskočeno kvůli rate limitu loginu')
    }
    await dismissCookies(page)
    await page.goto('/prihlaseni')
    await page.locator('#email').fill(personaEmail(persona))
    await page.locator('#password').fill(personaPassword(persona))
    await page.getByRole('button', { name: 'Přihlásit se' }).click()
    await expect(page, `persona ${persona.key} se musí přihlásit a dostat do /app`).toHaveURL(
      /\/app/,
      { timeout: 20_000 },
    )
    await page.context().storageState({ path: authFile(persona.key) })
  })
}
