import { ApiError, http } from '@/lib/http'
import type { DayCloseResponse } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

/**
 * Zavření obchodního dne + Z-report (Fáze 2). API-only — day-close existuje jen proti
 * reálnému backendu, v mock režimu se tento composable nevolá (stránka sekci skryje).
 *
 * `getDayClose` vrátí stav dne (Open/Closed), `closeDay` den uzavře a vrátí Z-report.
 * Chyby z API (ApiError) jsou přebaleny na `DayCloseError` se srozumitelnou hláškou dle
 * statusu (409 už zavřený / otevřené účty, 422 neplatný den/pobočka, 403 cizí pobočka),
 * ať je UI umí ukázat.
 */

/** Tělo POST /day-close. Hotovostní pole jsou volitelná (uzávěrka hotovosti nemusí proběhnout). */
export interface CloseDayPayload {
  date: string // 'YYYY-MM-DD'
  locationId: string
  cashOpening?: number | null
  cashCountedClosing?: number | null
  cashDrop?: number | null
  cashPayIns?: number | null
  cashPayOuts?: number | null
}

/** Query pro GET /day-close — uzavřené Z-reporty v rozsahu. */
export interface DayCloseListParams {
  from?: string // 'YYYY-MM-DD'
  to?: string // 'YYYY-MM-DD'
  locationId?: string
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
        return new DayCloseError(409, e.message || 'Den je už uzavřený nebo má otevřené účty.')
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

/**
 * Chyby znovuotevření mají vlastní slovník — obecné „zavření dne se nezdařilo" by obsluze neřeklo,
 * co se stalo. Blokující důvody (novější uzávěrka, už otevřená) posílá server v textu 409, ten se
 * proto přebírá beze změny; u ostatních stavů nikdy netvrdíme, že se stav změnil.
 */
function toReopenError(e: unknown): DayCloseError {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 409:
        return new DayCloseError(
          409,
          e.message || 'Uzávěrku nelze znovu otevřít, protože se mezitím změnil její stav.',
        )
      case 403:
        return new DayCloseError(403, 'Na znovuotevření uzávěrky nemáte oprávnění.')
      case 404:
        return new DayCloseError(404, 'Uzávěrka nebyla nalezena.')
      case 422:
        return new DayCloseError(422, e.message || 'Vyplňte důvod znovuotevření uzávěrky.')
      default:
        return new DayCloseError(
          e.status,
          'Akci se nepodařilo dokončit. Stav uzávěrky se nezměnil.',
        )
    }
  }
  return new DayCloseError(0, 'Akci se nepodařilo dokončit. Stav uzávěrky se nezměnil.')
}

export function useDayClose() {
  /** Uzavřené Z-reporty v rozsahu. GET /day-close?from=…&to=…&locationId=… */
  async function listDayCloses(params: DayCloseListParams): Promise<DayCloseResponse[]> {
    const pageSize = 100
    const first = await fetchDayClosePage(params, 1, pageSize)
    const all = [...first.items]
    const totalPages = Math.ceil(first.total / pageSize)

    for (let page = 2; page <= totalPages; page++) {
      const next = await fetchDayClosePage(params, page, pageSize)
      all.push(...next.items)
    }

    return all
  }

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

  /**
   * Vrátí omylem zavřenou uzávěrku do rozpracovaného stavu. POST /day-close/{id}/reopen
   *
   * Autoritativní je server: rozhoduje o oprávnění i o blokujících podmínkách (novější uzávěrka,
   * už znovuotevřená uzávěrka). Klient nesmí stav přepnout lokálně — UI se mění až z odpovědi.
   */
  function reopenDayClose(id: string, reason: string): Promise<DayCloseResponse> {
    return http
      .post<DayCloseResponse>(`/day-close/${encodeURIComponent(id)}/reopen`, { reason })
      .catch((e) => {
        throw toReopenError(e)
      })
  }

  return { listDayCloses, getDayClose, closeDay, reopenDayClose }
}

function fetchDayClosePage(
  params: DayCloseListParams,
  page: number,
  pageSize: number,
): Promise<PagedResult<DayCloseResponse>> {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort: 'date',
  })
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.locationId) qs.set('locationId', params.locationId)

  return http.get<PagedResult<DayCloseResponse>>(`/day-close?${qs.toString()}`).catch((e) => {
    throw toDayCloseError(e)
  })
}
