import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

/**
 * Správa členů firmy a pozvánek (stránka Tým) — čte VÝHRADNĚ backend přes `http`
 * (`/company/members`, `/company/invitations`), žádná mock/localStorage vrstva (vzor CRM).
 * PIN se nikdy nevrací (jen `hasPin`); pozvánkový token přijde JEDNOU v odpovědi create.
 */

export type MemberRole =
  | 'Owner'
  | 'Admin'
  | 'Manager'
  | 'Accountant'
  | 'Employee'
  | 'Kitchen'
  | 'Stockkeeper'

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  Owner: 'Majitel',
  Admin: 'Administrátor',
  Manager: 'Vedoucí',
  Accountant: 'Účetní',
  Employee: 'Obsluha',
  Kitchen: 'Kuchyně',
  Stockkeeper: 'Skladník',
}

/** Role, které jde pozvat e-mailem (Owner vzniká jen založením firmy). */
export const INVITABLE_ROLES: MemberRole[] = [
  'Admin',
  'Manager',
  'Accountant',
  'Employee',
  'Kitchen',
  'Stockkeeper',
]

/** Role provozního pracovníka bez e-mailu (privilegované účty potřebují reálné přihlášení). */
export const STAFF_ROLES: MemberRole[] = [
  'Manager',
  'Accountant',
  'Employee',
  'Kitchen',
  'Stockkeeper',
]

export interface Member {
  userId: string
  email: string | null
  displayName: string
  role: MemberRole
  locationId: string | null
  discountLimitPercent: number | null
  hasPin: boolean
}

export interface Invitation {
  id: string
  email: string
  role: MemberRole
  locationId: string | null
  status: 'Pending' | 'Accepted' | 'Revoked'
  expiresAt: string
  createdAt: string
}

export interface InvitationCreated {
  invitation: Invitation
  /** Jednorázový token — zobrazit hned, už se nikdy nevrátí. */
  token: string
  /** false = e-mail se nepodařilo odeslat (typicky chybí SMTP) — token předejte sami. */
  emailDelivered: boolean
}

export function useMembers() {
  function listMembers(page = 1, pageSize = 100): Promise<PagedResult<Member>> {
    return http.get<PagedResult<Member>>(
      `/company/members?page=${page}&pageSize=${pageSize}&sort=name`,
    )
  }

  function updateMember(
    userId: string,
    input: { role: MemberRole; locationId?: string | null; discountLimitPercent?: number | null },
  ): Promise<Member> {
    return http.put<Member>(`/company/members/${userId}`, {
      role: input.role,
      locationId: input.locationId ?? null,
      discountLimitPercent: input.discountLimitPercent ?? null,
    })
  }

  function removeMember(userId: string): Promise<void> {
    return http.del<void>(`/company/members/${userId}`)
  }

  function createStaff(input: {
    displayName: string
    role: MemberRole
    locationId?: string | null
    discountLimitPercent?: number | null
  }): Promise<Member> {
    return http.post<Member>('/company/members/staff', {
      displayName: input.displayName,
      role: input.role,
      locationId: input.locationId ?? null,
      discountLimitPercent: input.discountLimitPercent ?? null,
    })
  }

  function setPin(userId: string, pin: string): Promise<void> {
    return http.put<void>(`/company/members/${userId}/pin`, { pin })
  }

  function clearPin(userId: string): Promise<void> {
    return http.del<void>(`/company/members/${userId}/pin`)
  }

  function listInvitations(page = 1, pageSize = 50): Promise<PagedResult<Invitation>> {
    return http.get<PagedResult<Invitation>>(
      `/company/invitations?page=${page}&pageSize=${pageSize}`,
    )
  }

  function createInvitation(input: {
    email: string
    role: MemberRole
    locationId?: string | null
  }): Promise<InvitationCreated> {
    return http.post<InvitationCreated>('/company/invitations', {
      email: input.email,
      role: input.role,
      locationId: input.locationId ?? null,
    })
  }

  function revokeInvitation(id: string): Promise<void> {
    return http.del<void>(`/company/invitations/${id}`)
  }

  return {
    listMembers,
    updateMember,
    removeMember,
    createStaff,
    setPin,
    clearPin,
    listInvitations,
    createInvitation,
    revokeInvitation,
  }
}
