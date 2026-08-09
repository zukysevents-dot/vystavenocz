import { describe, expect, it } from 'vitest'
import {
  classifySyncFailure,
  isDue,
  markFailed,
  offlineBlockReason,
  scheduleRetry,
  settlementDifference,
  syncBackoffMs,
  type QueuedSale,
} from '@/lib/offline-sales'

function queued(overrides: Partial<QueuedSale> = {}): QueuedSale {
  return {
    id: 'q1',
    status: 'pending',
    createdAt: '2026-08-07T20:15:00.000Z',
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    payload: {
      paymentMethod: 'Cash',
      locationId: 'loc-bar',
      items: [
        {
          productId: 'p1',
          description: 'Pivo',
          quantity: 2,
          unitPrice: 60,
          vatRate: 21,
          discountPercent: 0,
        },
      ],
      discountPercent: 0,
      tipAmount: 0,
      cashReceived: 200,
      priceLevelId: null,
      idempotencyKey: 'klic-jedna-jedina',
      soldAt: '2026-08-07T20:15:00.000Z',
    },
    snapshot: { total: 120, itemCount: 2, catalogSavedAt: '2026-08-07T14:32:00.000Z' },
    ...overrides,
  }
}

describe('backoff opakovaného odeslání', () => {
  it('roste a nakonec se zastropuje', () => {
    expect(syncBackoffMs(1)).toBe(5_000)
    expect(syncBackoffMs(2)).toBe(15_000)
    expect(syncBackoffMs(3)).toBe(60_000)
    expect(syncBackoffMs(4)).toBe(300_000)
    expect(syncBackoffMs(5)).toBe(900_000)
    expect(syncBackoffMs(99)).toBe(900_000)
  })
})

describe('vyhodnocení neúspěšného odeslání', () => {
  it('výpadek sítě je jen důvod k opakování', () => {
    expect(classifySyncFailure(null).kind).toBe('retry')
  })

  it('uzavřený den prodej NEZAHODÍ, jen ho označí k rozhodnutí', () => {
    const outcome = classifySyncFailure(409)
    expect(outcome.kind).toBe('failed')
    expect(outcome.message).toContain('uzavřený')
  })

  it('serverovou českou hlášku předá uživateli beze změny', () => {
    expect(
      classifySyncFailure(409, 'Obchodní den je pro tuto pobočku už uzavřený (uzávěrka).').message,
    ).toBe('Obchodní den je pro tuto pobočku už uzavřený (uzávěrka).')
  })

  it('validace a chybějící oprávnění končí ve frontě jako failed', () => {
    expect(classifySyncFailure(422).kind).toBe('failed')
    expect(classifySyncFailure(403).kind).toBe('failed')
  })

  it('přetížený nebo rozbitý server znamená opakovat, ne zahodit', () => {
    expect(classifySyncFailure(429).kind).toBe('retry')
    expect(classifySyncFailure(500).kind).toBe('retry')
    expect(classifySyncFailure(503).kind).toBe('retry')
  })
})

describe('stav prodeje ve frontě', () => {
  it('opakování NIKDY nemění idempotency klíč ani obsah účtenky', () => {
    const original = queued()
    const retried = scheduleRetry(original, 'Zatím bez připojení.', 1_000)

    expect(retried.payload).toEqual(original.payload)
    expect(retried.payload.idempotencyKey).toBe('klic-jedna-jedina')
    expect(retried.attempts).toBe(1)
    expect(retried.nextAttemptAt).toBe(1_000 + syncBackoffMs(1))
    expect(retried.lastError).toBe('Zatím bez připojení.')
  })

  it('odmítnutý prodej zůstává ve frontě s vysvětlením', () => {
    const failed = markFailed(queued(), 'Den byl mezitím uzavřený.')
    expect(failed.status).toBe('failed')
    expect(failed.payload.idempotencyKey).toBe('klic-jedna-jedina')
    expect(failed.lastError).toBe('Den byl mezitím uzavřený.')
  })

  it('na řadu jde jen čekající prodej po uplynutí backoffu', () => {
    expect(isDue(queued({ nextAttemptAt: 500 }), 1_000)).toBe(true)
    expect(isDue(queued({ nextAttemptAt: 5_000 }), 1_000)).toBe(false)
    expect(isDue(queued({ status: 'failed', nextAttemptAt: 0 }), 1_000)).toBe(false)
  })
})

describe('co offline nejde', () => {
  it('karta ani věrnostní body', () => {
    expect(
      offlineBlockReason({ paymentMethod: 'Card', customerId: null, redeemPoints: 0 }),
    ).toContain('hotovost')
    expect(
      offlineBlockReason({ paymentMethod: 'Cash', customerId: 'cust-1', redeemPoints: 0 }),
    ).toContain('věrnostní')
    expect(
      offlineBlockReason({ paymentMethod: 'Cash', customerId: null, redeemPoints: 5 }),
    ).toContain('věrnostní')
  })

  it('obyčejný hotovostní prodej projde', () => {
    expect(
      offlineBlockReason({ paymentMethod: 'Cash', customerId: null, redeemPoints: 0 }),
    ).toBeNull()
  })
})

describe('rozdíl proti offline vytištěné částce', () => {
  it('shodná částka se neřeší', () => {
    expect(settlementDifference(120, 120)).toBeNull()
  })

  it('promo akce na serveru zlevnila — rozdíl se ukáže, ne zamlčí', () => {
    expect(settlementDifference(120, 108)).toBe(-12)
    expect(settlementDifference(120, 132.5)).toBe(12.5)
  })
})
