import { ApiError, http } from '@/lib/http'
import type { DayCloseResponse } from '@/lib/types'

/**
 * Zavření obchodního dne + Z-report (Fáze 2). API-only — day-close existuje jen proti
 * reálnému backendu, v mock režimu se tento composable nevolá (stránka sekci skryje).
 *
 * `getDayClose` vrátí stav dne (Open/Closed), `closeDay` den uzavře a vrátí Z-report.
 * Chyby z API (ApiError) jsou přebaleny na `DayCloseError` se srozumitelnou hláškou dle
 * statusu (409 už zavřený, 422 neplatný den/pobočka, 403 cizí pobočka), ať je UI umí ukázat.
 */

/** Tělo POST /day-close. Hotovostní pole jsou volitelná (uzávěrka hotovosti nemusí proběhnout). */
export interface CloseDayPayload {
  date: string // 'YYYY-MM-DD'
  locationId: string
  cashOpening?: number | null
  cashCountedClosing?: number | null
  cashDrop?: number | null
}

/** Chyba zavření dne se srozumitelnou (českou) hláškou a HTTP statusem pro UI logiku. */
export class DayCloseError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'DayCloseError'
    this.status = status
  }
}

function toDayCloseError(e: unknown): DayCloseError {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 409:
        return new DayCloseError(409, 'Den je už uzavřený.')
      case 422:
        return new DayCloseError(422, 'Den nelze uzavřít — zkontrolujte datum a pobočku.')
      case 403:
        return new DayCloseError(403, 'Nemáte oprávnění uzavřít tuto pobočku.')
      default:
        return new DayCloseError(e.status, e.message || 'Zavření dne se nezdařilo.')
    }
  }
  return new DayCloseError(0, 'Zavření dne se nezdařilo. Zkontrolujte připojení k serveru.')
}

export function useDayClose() {
  /** Stav dne pro pobočku. GET /day-close/{date}?locationId=… */
  function getDayClose(date: string, locationId: string): Promise<DayCloseResponse> {
    return http
      .get<DayCloseResponse>(`/day-close/${date}?locationId=${encodeURIComponent(locationId)}`)
      .catch((e) => {
        throw toDayCloseError(e)
      })
  }

  /** Uzavře den a vrátí Z-report. POST /day-close */
  function closeDay(payload: CloseDayPayload): Promise<DayCloseResponse> {
    return http.post<DayCloseResponse>('/day-close', payload).catch((e) => {
      throw toDayCloseError(e)
    })
  }

  return { getDayClose, closeDay }
}
