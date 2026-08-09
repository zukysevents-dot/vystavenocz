import { describe, expect, it, beforeEach } from 'vitest'
import { consumeIntent, isUserCancelled, rememberIntent, safeRedirect } from '@/lib/oauth'

describe('oauth helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('redirects only inside the application', () => {
    expect(safeRedirect('/app/faktury')).toBe('/app/faktury')
    expect(safeRedirect('/app/onboarding')).toBe('/app/onboarding')
  })

  it('refuses an off-site target — a callback must not become an open redirect', () => {
    expect(safeRedirect('//zlyweb.cz')).toBe('/app')
    expect(safeRedirect('https://zlyweb.cz/app')).toBe('/app')
    expect(safeRedirect('javascript:alert(1)')).toBe('/app')
    expect(safeRedirect(null)).toBe('/app')
    expect(safeRedirect('')).toBe('/app')
  })

  it('remembers whether the user came from login or registration', () => {
    rememberIntent('register')

    expect(consumeIntent()).toBe('register')
    // Jednorázově — další návrat už je běžné přihlášení.
    expect(consumeIntent()).toBe('login')
  })

  it('tells a user cancellation apart from a provider failure', () => {
    expect(isUserCancelled('access_denied')).toBe(true)
    expect(isUserCancelled('user_cancelled_authorize')).toBe(true)
    expect(isUserCancelled('server_error')).toBe(false)
    expect(isUserCancelled(null)).toBe(false)
  })
})
