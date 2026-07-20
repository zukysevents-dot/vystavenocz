import { http } from '@/lib/http'

// API tokeny firmy pro veřejné API (api/public/v1). Správa jen Owner/Admin (backend `integrations.api`).
// Token se vrací plaintext JEN při vytvoření (`ApiTokenCreated.token`) — dál existuje pouze hashovaně,
// výpis nese jen `tokenPrefix` pro identifikaci. Jen API režim (vzor useIntegrations).

export const API_TOKEN_SCOPES = [
  { value: 'products.read', label: 'Produkty (čtení)' },
  { value: 'customers.read', label: 'Zákazníci (čtení)' },
  { value: 'invoices.read', label: 'Faktury (čtení)' },
  { value: 'sales.read', label: 'Prodeje (čtení)' },
  { value: 'stock.read', label: 'Skladové stavy (čtení)' },
  { value: 'clients.read', label: 'Klienti (čtení)' },
  // Zápisové scopes (V2): oddělené od čtení — read-only token nikdy nemůže měnit data.
  { value: 'clients.write', label: 'Klienti (zápis)' },
  { value: 'customers.write', label: 'Zákazníci (zápis)' },
  { value: 'products.write', label: 'Produkty (zápis)' },
  { value: 'invoices.write', label: 'Faktury (zápis — koncept a vystavení)' },
] as const

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number]['value']

export interface ApiToken {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

// Odpověď vytvoření — `token` je plaintext a přijde JEN JEDNOU.
export interface ApiTokenCreated extends ApiToken {
  token: string
}

export interface CreateApiTokenRequest {
  name: string
  scopes: string[]
  expiresAt?: string | null
}

export function useApiTokens() {
  function list(): Promise<ApiToken[]> {
    return http.get<ApiToken[]>('/api-tokens')
  }

  function create(request: CreateApiTokenRequest): Promise<ApiTokenCreated> {
    return http.post<ApiTokenCreated>('/api-tokens', request)
  }

  function revoke(id: string): Promise<void> {
    return http.del(`/api-tokens/${id}`)
  }

  return { list, create, revoke }
}
