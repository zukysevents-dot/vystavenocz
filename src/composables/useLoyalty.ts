import { http } from '@/lib/http'

export interface LoyaltySettings {
  earnRateCzkPerPoint: number
  pointValueCzk: number
  maxRedeemPointsPerSale: number
}

export function useLoyalty() {
  function getSettings(): Promise<LoyaltySettings> {
    return http.get<LoyaltySettings>('/loyalty/settings')
  }

  function updateSettings(input: LoyaltySettings): Promise<LoyaltySettings> {
    return http.put<LoyaltySettings>('/loyalty/settings', input)
  }

  return { getSettings, updateSettings }
}
