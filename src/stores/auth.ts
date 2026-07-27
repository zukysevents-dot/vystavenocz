import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/lib/types'
import { http, isApiMode, getTokens, setTokens, ApiError, type Tokens } from '@/lib/http'
import { DEFAULT_ENABLED_MODULES, normalizeModules, type AppModuleId } from '@/lib/modules'
import { permissiveSnapshot, type AccessMode, type EntitlementSnapshot } from '@/lib/entitlements'

// Dva režimy podle VITE_API_URL (viz http.ts):
//  - mock (prázdné URL): účty + session žijí v localStorage (vývoj / e2e seed).
//  - API: login/register/logout proti /api/v1/auth/*, identita z /me, tokeny v http.ts.
// Rozhraní storu (login/register/logout/init/isAuthenticated/user) je v obou režimech stejné.
const USER_KEY = 'vystaveno.auth.user.v1' // mock session
const USERS_KEY = 'vystaveno.auth.users.v1' // mock "databáze" účtů
const SESSION_KEY = 'vystaveno.auth.session.v1' // API: cache identity vedle tokenů (sync init po reloadu)
// MOCK režim (náhled/e2e) nemá server, takže ani tarif — tímhle klíčem se dá stav předplatného
// nasimulovat pro demo a testy. V API režimu se NEČTE: tam snapshot vždy přichází z /me.
const MOCK_ENTITLEMENT_KEY = 'vystaveno.entitlement.mock.v1'

type StoredUser = User & { password: string }
type AuthResult = { ok: true } | { ok: false; error: string }

export interface AccessibleCompany {
  id: string
  name: string
  role: string
  locationId: string | null
}
interface MeResponse {
  userId?: string
  id?: string
  email?: string
  displayName?: string
  companyId: string | null
  role: string | null
  modules?: string[]
  features?: string[]
  companies?: AccessibleCompany[]
  entitlement?: EntitlementSnapshot
}
interface Session {
  user: User
  companyId: string | null
  role: string | null
  modules: AppModuleId[]
  features: string[]
  entitlement?: EntitlementSnapshot
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function makeId(): string {
  return `u_${Math.random().toString(36).slice(2, 10)}`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const companyId = ref<string | null>(null)
  const role = ref<string | null>(null)
  const modules = ref<AppModuleId[]>(DEFAULT_ENABLED_MODULES)
  const features = ref<string[]>([])
  // Entitlement snapshot ze serveru. Fallback je záměrně povolující — dokud /me nedorazí, UI neblokujeme
  // (server odmítne sám). Po každém /me se PŘEPÍŠE serverovým stavem, takže cache nemůže odemknout modul.
  const entitlement = ref<EntitlementSnapshot>(permissiveSnapshot(DEFAULT_ENABLED_MODULES))
  // Firmy, kam má účet přístup (z /me) — jen runtime stav pro přepínač, nepersistuje se.
  const companies = ref<AccessibleCompany[]>([])
  const initialized = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  function clearApiSession(): void {
    setTokens(null)
    user.value = null
    companyId.value = null
    role.value = null
    modules.value = DEFAULT_ENABLED_MODULES
    features.value = []
    entitlement.value = permissiveSnapshot(DEFAULT_ENABLED_MODULES)
    companies.value = []
    persistSession()
  }

  function persistMock(): void {
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    else localStorage.removeItem(USER_KEY)
  }

  function persistSession(): void {
    if (user.value) {
      const session: Session = {
        user: user.value,
        companyId: companyId.value,
        role: role.value,
        modules: modules.value,
        features: features.value,
        entitlement: entitlement.value,
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  function init(): void {
    if (initialized.value) return
    initialized.value = true

    if (isApiMode()) {
      // Identita platí jen s tokeny; jinak session zahodit (po logoutu/expiraci).
      if (getTokens()) {
        try {
          const raw = localStorage.getItem(SESSION_KEY)
          const s = raw ? (JSON.parse(raw) as Session) : null
          if (s) {
            user.value = s.user
            companyId.value = s.companyId
            role.value = s.role
            modules.value = normalizeModules(s.modules)
            features.value = s.features ?? []
            // Cache smí jen zrychlit první render; jakmile /me odpoví, přepíše ji server. Bez snapshotu
            // radši povolující fallback než starý (možná už neplatný) stav.
            entitlement.value = s.entitlement ?? permissiveSnapshot(modules.value)
          }
        } catch {
          /* poškozená session → nepřihlášen */
        }
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
      return
    }

    try {
      const raw = localStorage.getItem(USER_KEY)
      user.value = raw ? (JSON.parse(raw) as User) : null
      const mock = localStorage.getItem(MOCK_ENTITLEMENT_KEY)
      if (mock) entitlement.value = JSON.parse(mock) as EntitlementSnapshot
    } catch {
      user.value = null
      modules.value = DEFAULT_ENABLED_MODULES
      features.value = []
    }
  }

  async function loadMe(email: string, fullName: string | null): Promise<void> {
    const me = await http.get<MeResponse>('/me')
    user.value = {
      id: me.userId ?? me.id ?? '',
      email: me.email ?? email,
      fullName: me.displayName ?? fullName,
    }
    companyId.value = me.companyId
    role.value = me.role
    modules.value = normalizeModules(me.modules)
    features.value = me.features ?? []
    companies.value = me.companies ?? []
    entitlement.value = me.entitlement ?? permissiveSnapshot(modules.value)
    persistSession()
  }

  // Přepnutí aktivní firmy (multi-company účet): server vydá nový token pár s cílovou companyId,
  // pak se přenačte identita. Volající po úspěchu přejde na /app (stará data stránek neplatí).
  async function switchCompany(targetCompanyId: string): Promise<boolean> {
    if (!isApiMode() || !user.value) return false
    try {
      const tokens = await http.post<Tokens>(`/companies/${targetCompanyId}/switch`)
      setTokens(tokens)
      // Data PŘEDCHOZÍ firmy nesmí v nové firmě zůstat ani na chvíli. Místo invalidace desítek storů
      // (jeden zapomenutý = únik cizích dat) zahodíme všechny tenant cache a necháme app nastartovat
      // znovu — volající pak jen udělá hard redirect na /app.
      clearTenantCaches()
      await loadMe(user.value.email, user.value.fullName)
      return true
    } catch (e) {
      console.error('Přepnutí firmy selhalo:', e)
      return false
    }
  }

  // Smaže lokální cache vázané na firmu (profily, seznamy, rozpracovaná data). Přihlášení a session
  // zůstávají — přepínáme firmu, ne uživatele.
  function clearTenantCaches(): void {
    const keep = new Set([SESSION_KEY, USER_KEY, USERS_KEY])
    for (const key of Object.keys(localStorage)) {
      if (keep.has(key)) continue
      if (key.startsWith('vystaveno.') || key.startsWith('vystaveno:')) localStorage.removeItem(key)
    }
  }

  // Po změně tenant kontextu (založení firmy vydá nové tokeny s companyId) přenačti identitu.
  async function reloadMe(): Promise<void> {
    if (!isApiMode() || !user.value) return
    try {
      await loadMe(user.value.email, user.value.fullName)
    } catch {
      // Síť/výpadek — necháme dosavadní stav. Přístup je stejně vynucený serverem, takže zastaralý
      // snapshot může nejvýš zobrazit položku, kterou server odmítne; shodit appku by bylo horší.
    }
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    if (isApiMode()) {
      try {
        const tokens = await http.post<Tokens>('/auth/login', { email, password })
        setTokens(tokens)
        await loadMe(email, null)
        return { ok: true }
      } catch (e) {
        clearApiSession()
        const msg =
          e instanceof ApiError && e.status === 401
            ? 'Špatný e-mail nebo heslo.'
            : 'Přihlášení selhalo. Zkuste to znovu.'
        return { ok: false, error: msg }
      }
    }

    const found = loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!found || found.password !== password) {
      return { ok: false, error: 'Špatný e-mail nebo heslo.' }
    }
    user.value = { id: found.id, email: found.email, fullName: found.fullName }
    persistMock()
    return { ok: true }
  }

  async function register(
    email: string,
    password: string,
    fullName: string | null,
  ): Promise<AuthResult> {
    if (isApiMode()) {
      try {
        // Registrace nevrací tokeny → rovnou přihlásit. DisplayName je povinné (fallback e-mail).
        await http.post('/auth/register', { email, password, displayName: fullName ?? email })
      } catch (e) {
        const msg =
          e instanceof ApiError && e.status === 409
            ? 'Účet s tímto e-mailem už existuje.'
            : 'Registrace selhala. Zkuste to znovu.'
        return { ok: false, error: msg }
      }
      const res = await login(email, password)
      if (res.ok && fullName && user.value) {
        user.value = { ...user.value, fullName }
        persistSession()
      }
      return res
    }

    const users = loadUsers()
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Účet s tímto e-mailem už existuje.' }
    }
    const created: StoredUser = { id: makeId(), email, fullName, password }
    users.push(created)
    saveUsers(users)
    user.value = { id: created.id, email: created.email, fullName: created.fullName }
    persistMock()
    return { ok: true }
  }

  async function logout(): Promise<void> {
    if (isApiMode()) {
      const tokens = getTokens()
      if (tokens?.refreshToken) {
        try {
          await http.post('/auth/logout', { refreshToken: tokens.refreshToken })
        } catch {
          /* best-effort — odhlásit i při výpadku sítě */
        }
      }
      clearApiSession()
      return
    }

    user.value = null
    modules.value = DEFAULT_ENABLED_MODULES
    features.value = []
    entitlement.value = permissiveSnapshot(DEFAULT_ENABLED_MODULES)
    persistMock()
  }

  // Smí uživatel na něco vyhrazené daným rolím? Neznámá role (mock režim / backend ji nevrací)
  // = neblokujeme (fail-open) — skutečné vynucení dělá backend; tohle je jen UX vrstva.
  function hasRole(...roles: string[]): boolean {
    if (role.value === null) return true
    return roles.includes(role.value)
  }

  function hasModule(module: AppModuleId): boolean {
    return modules.value.includes(module)
  }

  function hasFeature(feature: string): boolean {
    if (!features.value.length) return true
    return features.value.includes(feature)
  }

  // Režim přístupu ze serveru. `read_only` = předplatné skončilo (data zůstávají ke čtení a exportu),
  // `locked` = přístup pozastavený. Zápisové akce v UI se podle toho schovají; server je blokuje vždy.
  const accessMode = computed<AccessMode>(() => entitlement.value.accessMode)
  const isReadOnly = computed(() => accessMode.value !== 'full')
  const plan = computed(() => entitlement.value.plan)
  const lockedModules = computed(() => entitlement.value.lockedModules)
  const canManageSubscription = computed(() => entitlement.value.plan.canManageSubscription)

  return {
    user,
    companyId,
    role,
    modules,
    features,
    companies,
    entitlement,
    accessMode,
    isReadOnly,
    plan,
    lockedModules,
    canManageSubscription,
    initialized,
    isAuthenticated,
    init,
    clearInvalidSession: clearApiSession,
    login,
    register,
    logout,
    reloadMe,
    switchCompany,
    hasRole,
    hasModule,
    hasFeature,
    clearTenantCaches,
  }
})
