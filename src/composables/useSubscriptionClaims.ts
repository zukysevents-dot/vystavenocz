import { http } from '@/lib/http'

export type SubscriptionClaimState = 'Captured' | 'Accepted' | 'Rejected' | 'Qualified' | 'Revoked'
export type SubscriptionBenefitKind = 'FreeBillingPeriods' | 'Credit' | 'ManualReview'
export type SubscriptionBenefitState = 'Pending' | 'Available' | 'Applied' | 'Revoked'

export interface SubscriptionClaimBenefit {
  kind: SubscriptionBenefitKind
  value: number
  state: SubscriptionBenefitState
  availableAfter: string
}

export interface SubscriptionClaim {
  attributionId: string
  state: SubscriptionClaimState
  benefit: SubscriptionClaimBenefit
}

export interface SubscriptionClaimStatus extends SubscriptionClaim {
  campaignKey: string
  variantKey: string
  claimedAt: string
}

export function useSubscriptionClaims() {
  const getOwn = (): Promise<SubscriptionClaimStatus> => http.get('/subscription-claims/me')
  const redeem = (
    code: string,
    termsVersion: string,
    idempotencyKey: string,
  ): Promise<SubscriptionClaim> =>
    http.postWithHeaders(
      '/subscription-claims/redeem',
      { code, termsVersion },
      { 'Idempotency-Key': idempotencyKey },
    )

  return { getOwn, redeem }
}
