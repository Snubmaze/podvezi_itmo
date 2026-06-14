/**
 * Доменный сервис авторизации/профиля. Аккаунт = логин ITMO ID (см.
 * architecture.md 5.1): вход через ITMO ID (логин+пароль), смена логина =
 * смена аккаунта. Номер ИСУ генерируется случайно один раз при создании
 * аккаунта и сохраняется как атрибут (не вводится вручную).
 *
 * UI и хуки работают ТОЛЬКО через интерфейс `AuthBackend`. В Telegram —
 * Supabase-реализация (Edge Function `telegram-auth` ключит по логину), в
 * браузере (дев/демо) — мок (аккаунты в localStorage по логину).
 */

import { supabase } from '@/lib/supabase'
import { getInitDataRaw, isTelegramEnv } from '@/lib/telegram'
import type { ItmoIdProfile } from '@/services/itmoId'
import type { DriverVerificationStatus, User, UserRole } from '@/types/db'

export interface AuthBackend {
  /** Текущий аккаунт по активной сессии; null — сессии нет (нужен вход). */
  authenticate(): Promise<User | null>
  /**
   * Вход через ITMO ID по логину (создаёт аккаунт при первом входе,
   * генерирует ИСУ). `profile` — данные из мок ITMO ID, записываются в профиль.
   */
  loginWithItmoId(login: string, profile: ItmoIdProfile): Promise<User>
  /** Частичное обновление профиля (описание и т.п.). */
  updateProfile(patch: Partial<User>): Promise<User>
  /** Выход: завершить сессию (данные аккаунта сохраняются). */
  logout(): Promise<void>
}

/** Случайный 6-значный номер ИСУ (генерируется один раз при создании аккаунта). */
export function generateIsuNumber(): string {
  return String(100_000 + Math.floor(Math.random() * 900_000))
}

// --- Мок-реализация (аккаунты по логину ITMO ID в localStorage) ----------

const MOCK_ACCOUNTS_KEY = 'podvezi.mock.accounts'
const MOCK_CURRENT_KEY = 'podvezi.mock.currentLogin'

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

function getCurrentLogin(): string | null {
  try {
    return localStorage.getItem(MOCK_CURRENT_KEY)
  } catch {
    return null
  }
}

function setCurrentLogin(login: string | null): void {
  try {
    if (login === null) localStorage.removeItem(MOCK_CURRENT_KEY)
    else localStorage.setItem(MOCK_CURRENT_KEY, login)
  } catch {
    // localStorage недоступен — игнорируем
  }
}

function createMockUser(profile: ItmoIdProfile): User {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    telegram_id: 100_000_000 + Math.floor(Math.random() * 900_000_000),
    telegram_username: 'dev_user',
    full_name: profile.full_name,
    isu_number: generateIsuNumber(),
    itmo_id_linked: true,
    course: profile.course,
    age: profile.age,
    description: null,
    role: 'passenger',
    driver_verification_status: 'none',
    phone: null,
    avatar_url: profile.avatar_url,
    created_at: now,
    updated_at: now,
  }
}

function loadCurrentMockUser(): User | null {
  const login = getCurrentLogin()
  if (!login) return null
  return loadAccounts()[login] ?? null
}

function storeMockUser(login: string, user: User): void {
  const accounts = loadAccounts()
  accounts[login] = user
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

    async loginWithItmoId(login, profile) {
      await delay(500)
      const accounts = loadAccounts()
      // Существующий аккаунт открываем как есть (сохранённый ИСУ/поездки/роль);
      // новый — создаём со случайным ИСУ и данными ITMO ID.
      const user = accounts[login] ?? createMockUser(profile)
      accounts[login] = user
      saveAccounts(accounts)
      setCurrentLogin(login)
      return user
    },

    async updateProfile(patch) {
      await delay(200)
      const login = getCurrentLogin()
      const current = loadCurrentMockUser()
      if (!login || !current) throw new Error('Нет активного аккаунта')
      const updated: User = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      }
      storeMockUser(login, updated)
      return updated
    },

    async logout() {
      setCurrentLogin(null)
    },
  }
}

/** DEV-only: подмена статуса верификации текущего мок-аккаунта. */
export function devSetMockDriverStatus(status: DriverVerificationStatus): void {
  const login = getCurrentLogin()
  const user = loadCurrentMockUser()
  if (!login || !user) return
  storeMockUser(login, {
    ...user,
    driver_verification_status: status,
    updated_at: new Date().toISOString(),
  })
}

/** DEV-only: подмена роли текущего мок-аккаунта (для проверки админки). */
export function devSetMockRole(role: UserRole): void {
  const login = getCurrentLogin()
  const user = loadCurrentMockUser()
  if (!login || !user) return
  storeMockUser(login, { ...user, role, updated_at: new Date().toISOString() })
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

    async loginWithItmoId(login, profile) {
      const initDataRaw = getInitDataRaw()
      if (!initDataRaw) {
        throw new Error('Откройте приложение из Telegram')
      }
      const { data, error } = await supabase.functions.invoke<TelegramAuthResponse>(
        'telegram-auth',
        { body: { initDataRaw, login } },
      )
      if (error || !data) {
        // Пытаемся достать текст ошибки из тела ответа функции (для диагностики).
        let detail = ''
        const ctx = (error as { context?: Response })?.context
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = (await ctx.json()) as { error?: string; detail?: string }
            detail = body.detail || body.error || ''
          } catch {
            /* тело не JSON — игнорируем */
          }
        }
        throw new Error(
          detail
            ? `Не удалось войти через ITMO ID: ${detail}`
            : 'Не удалось войти через ITMO ID. Попробуйте ещё раз.',
        )
      }
      const { data: setData, error: setError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (setError || !setData.session) {
        throw new Error('Не удалось установить сессию')
      }
      // Записываем профиль ITMO ID (ИСУ сгенерирован на сервере при создании).
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          course: profile.course,
          age: profile.age,
          avatar_url: profile.avatar_url,
          itmo_id_linked: true,
        })
        .eq('id', setData.session.user.id)
        .select()
        .single()
      if (updateError || !updated) throw new Error('Не удалось загрузить профиль')
      return updated as User
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
