import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/lib/types'

// MVP mock auth — žádný reálný backend. Uživatel + „databáze" účtů žijí v localStorage.
// Po napojení reálného API se nahradí těla akcí, rozhraní zůstane stejné.
const USER_KEY = 'vystaveno.auth.user.v1'
const USERS_KEY = 'vystaveno.auth.users.v1'

type StoredUser = User & { password: string }

type AuthResult = { ok: true } | { ok: false; error: string }

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
  const initialized = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  function persist(): void {
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    else localStorage.removeItem(USER_KEY)
  }

  function init(): void {
    if (initialized.value) return
    try {
      const raw = localStorage.getItem(USER_KEY)
      user.value = raw ? (JSON.parse(raw) as User) : null
    } catch {
      user.value = null
    }
    initialized.value = true
  }

  function login(email: string, password: string): AuthResult {
    const found = loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!found || found.password !== password) {
      return { ok: false, error: 'Špatný e-mail nebo heslo.' }
    }
    user.value = { id: found.id, email: found.email, fullName: found.fullName }
    persist()
    return { ok: true }
  }

  function register(email: string, password: string, fullName: string | null): AuthResult {
    const users = loadUsers()
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Účet s tímto e-mailem už existuje.' }
    }
    const created: StoredUser = { id: makeId(), email, fullName, password }
    users.push(created)
    saveUsers(users)
    user.value = { id: created.id, email: created.email, fullName: created.fullName }
    persist()
    return { ok: true }
  }

  function logout(): void {
    user.value = null
    persist()
  }

  return { user, initialized, isAuthenticated, init, login, register, logout }
})
