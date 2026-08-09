import { http } from '@/lib/http'

export type GrowthInvitationSource = 'Referral' | 'Partner'

export interface GrowthInvitation {
  code: string
  expiresAt: string
  benefitDescription: string
}

export interface ReferralOverview {
  activeInvitations: number
  capturedInvitations: number
  qualifiedInvitations: number
  availableFreeMonths: number
}

export interface PartnerProfile {
  companyId: string
  businessName: string
  status: 'Candidate' | 'Approved' | 'Suspended'
  commissionPercent: number
  commissionMonths: number
  coolingOffDays: number
  capturedCustomers: number
  qualifiedCustomers: number
  proposedCommissions: number
}

export function useGrowth() {
  const createReferral = (): Promise<GrowthInvitation> => http.post('/growth/referrals', {})
  const overview = (): Promise<ReferralOverview> => http.get('/growth/referrals/me')
  const redeem = (code: string, idempotencyKey: string) =>
    http.postWithHeaders(
      '/growth/redeem',
      { code, termsVersion: 'growth-referral-v1' },
      { 'Idempotency-Key': idempotencyKey },
    )
  const partner = (): Promise<PartnerProfile> => http.get('/growth/partner-profile')
  const submitPartner = (businessName: string, contactEmail: string): Promise<PartnerProfile> =>
    http.post('/growth/partner-profile', { businessName, contactEmail })
  const createPartnerInvitation = (): Promise<GrowthInvitation> =>
    http.post('/growth/partner-invitations', {})

  return { createReferral, overview, redeem, partner, submitPartner, createPartnerInvitation }
}
