/**
 * Доменный сервис авторизации/профиля. Аккаунт = номер ИСУ (см.
 * architecture.md 5.1): вход по ИСУ, смена ИСУ = смена аккаунта.
 *
 * UI и хуки работают ТОЛЬКО через интерфейс `AuthBackend`. В Telegram —
 * Supabase-реализация (Edge Function `telegram-auth` ключит по ИСУ), в
 * браузере (дев/демо) — мок (аккаунты в localStorage по ИСУ).
 */

import { supabase } from '@/lib/supabase'
import { getInitDataRaw, isTelegramEnv } from '@/lib/telegram'
import type { DriverVerificationStatus, User, UserRole } from '@/types/db'

export interface AuthBackend {
  /** Текущий аккаунт по активной сессии; null — сессии нет (нужен ввод ИСУ). */
  authenticate(): Promise<User | null>
  /** Вход по номеру ИСУ (создаёт аккаунт при первом входе). */
  loginWithIsu(isu: string): Promise<User>
  /** Частичное обновление профиля (привязка ITMO ID, описание и т.п.). */
  updateProfile(patch: Partial<User>): Promise<User>
  /** Выход: завершить сессию (данные аккаунта сохраняются). */
  logout(): Promise<void>
}

// --- Мок-реализация (аккаунты по ИСУ в localStorage) ---------------------

const MOCK_ACCOUNTS_KEY = 'podvezi.mock.accounts'
const MOCK_CURRENT_KEY = 'podvezi.mock.currentIsu'

function loadAccounts(): Record<string, User> {
  try {
    const raw = localStorage.getItem(MOCK_ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, User>) : {}
  } catch {
    return {}
  }
}

function saveAccounts(accounts: Record<string, User>): void {
  localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(accounts))
}

function getCurrentIsu(): string | null {
  try {
    return localStorage.getItem(MOCK_CURRENT_KEY)
  } catch {
    return null
  }
}

function setCurrentIsu(isu: string | null): void {
  try {
    if (isu === null) localStorage.removeItem(MOCK_CURRENT_KEY)
    else localStorage.setItem(MOCK_CURRENT_KEY, isu)
  } catch {
    // localStorage недоступен — игнорируем
  }
}

function createMockUser(isu: string): User {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    telegram_id: 100_000_000 + Math.floor(Math.random() * 900_000_000),
    telegram_username: 'dev_user',
    full_name: null,
    isu_number: isu,
    itmo_id_linked: false,
    course: null,
    age: null,
    description: null,
    role: 'passenger',
    driver_verification_status: 'none',
    phone: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  }
}

function loadCurrentMockUser(): User | null {
  const isu = getCurrentIsu()
  if (!isu) return null
  return loadAccounts()[isu] ?? null
}

function storeMockUser(user: User): void {
  if (!user.isu_number) return
  const accounts = loadAccounts()
  accounts[user.isu_number] = user
  saveAccounts(accounts)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createMockAuthBackend(): AuthBackend {
  return {
    async authenticate() {
      await delay(500)
      return loadCurrentMockUser()
    },

    async loginWithIsu(isu) {
      await delay(500)
      const accounts = loadAccounts()
      const user = accounts[isu] ?? createMockUser(isu)
      accounts[isu] = user
      saveAccounts(accounts)
      setCurrentIsu(isu)
      return user
    },

    async updateProfile(patch) {
      await delay(200)
      const current = loadCurrentMockUser()
      if (!current) throw new Error('Нет активного аккаунта')
      const updated: User = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      }
      storeMockUser(updated)
      return updated
    },

    async logout() {
      setCurrentIsu(null)
    },
  }
}

/** DEV-only: подмена статуса верификации текущего мок-аккаунта. */
export function devSetMockDriverStatus(status: DriverVerificationStatus): void {
  const user = loadCurrentMockUser()
  if (!user) return
  storeMockUser({
    ...user,
    driver_verification_status: status,
    updated_at: new Date().toISOString(),
  })
}

/** DEV-only: подмена роли текущего мок-аккаунта (для проверки админки). */
export function devSetMockRole(role: UserRole): void {
  const user = loadCurrentMockUser()
  if (!user) return
  storeMockUser({ ...user, role, updated_at: new Date().toISOString() })
}

// --- Supabase-реализация (Telegram) --------------------------------------

interface TelegramAuthResponse {
  access_token: string
  refresh_token: string
  is_new_user: boolean
}

async function loadProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as User
}

function createSupabaseAuthBackend(): AuthBackend {
  return {
    async authenticate() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return null
      return loadProfile(session.user.id)
    },

    async loginWithIsu(isu) {
      const initDataRaw = getInitDataRaw()
      if (!initDataRaw) {
        throw new Error('Откройте приложение из Telegram')
      }
      const { data, error } = await supabase.functions.invoke<TelegramAuthResponse>(
        'telegram-auth',
        { body: { initDataRaw, isu } },
      )
      if (error || !data) {
        throw new Error('Не удалось войти. Проверьте номер ИСУ.')
      }
      const { data: setData, error: setError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (setError || !setData.session) {
        throw new Error('Не удалось установить сессию')
      }
      const profile = await loadProfile(setData.session.user.id)
      if (!profile) throw new Error('Не удалось загрузить профиль')
      return profile
    },

    async updateProfile(patch) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Нет активной сессии')

      const { data, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single()
      if (error || !data) throw new Error('Не удалось обновить профиль')
      return data as User
    },

    async logout() {
      await supabase.auth.signOut()
    },
  }
}

/**
 * Активный backend авторизации.
 * В Telegram — реальная Supabase-реализация; в браузере (дев/демо) — мок.
 */
export const authBackend: AuthBackend = isTelegramEnv()
  ? createSupabaseAuthBackend()
  : createMockAuthBackend()
