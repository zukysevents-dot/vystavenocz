import { describe, expect, it } from 'vitest'
import {
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  auditDataLabel,
  auditDataValue,
  auditEntityLabel,
  parseAuditData,
} from './audit'

// Historie změn je jediné místo, kde uživatel vidí názvy akcí ze serveru. Dřív jich byla přeložená
// jen hrstka (15 ze 127), takže mu aplikace ukazovala kus kódu — „DayCloseReopened", „BUSINESSDAY".

describe('názvy akcí', () => {
  it('přeloží akci, kterou uživatel reálně potká', () => {
    expect(auditActionLabel('DayCloseReopened')).toBe('Znovuotevření uzávěrky')
    expect(auditActionLabel('SaleCancelled')).toBe('Storno prodeje')
    expect(auditActionLabel('InvoiceNumberChanged')).toBe('Změna čísla faktury')
  })

  it('neznámou akci aspoň rozdělí na slova, ať nevypadá jako kód', () => {
    expect(auditActionLabel('SomeFutureAction')).toBe('Some future action')
    expect(auditActionLabel('')).toBe('')
  })

  it('žádný překlad nezůstal anglicky (slepené velké písmeno uprostřed slova)', () => {
    const suspicious = Object.entries(AUDIT_ACTION_LABELS).filter(([, label]) =>
      /[a-z][A-Z]/.test(label),
    )
    expect(suspicious).toEqual([])
  })
})

describe('detaily záznamu', () => {
  it('přeloží klíče, které chodí u uzávěrky', () => {
    expect(auditDataLabel('businessDay')).toBe('Obchodní den')
    expect(auditDataLabel('zReportNumber')).toBe('Číslo Z-reportu')
    expect(auditDataLabel('originalClosedByUserId')).toBe('Původně uzavřel')
  })

  it('neznámý klíč zůstane čitelný', () => {
    expect(auditDataLabel('someNewField')).toBe('Some new field')
  })

  it('hodnoty formátuje česky', () => {
    expect(auditDataValue(1234.5)).toBe('1 234,5') // pevná mezera po tisících, desetinná čárka
    expect(auditDataValue(true)).toBe('ano')
    expect(auditDataValue(null)).toBe('—')
  })
})

describe('entity a data', () => {
  it('přeloží entitu a rozparsuje detaily', () => {
    expect(auditEntityLabel('DayClose')).toBe('Uzávěrka')
    expect(parseAuditData('{"reason":"překlep"}')).toEqual({ reason: 'překlep' })
    expect(parseAuditData('nevalidní json')).toBeNull()
    expect(parseAuditData(null)).toBeNull()
  })
})
