/**
 * Доменный сервис авторизации/профиля.
 *
 * UI и хуки работают ТОЛЬКО через интерфейс `AuthBackend`. На шаге 3a
 * используется мок-реализация (in-memory + localStorage, без Telegram и
 * Supabase) — чтобы прокликать весь флоу при разработке/демо.
 *
 * Часть 3b заменит мок на Supabase-реализацию (Edge Function `telegram-auth`
 * + `supabase.auth.setSession` + чтение/запись `public.users`), не меняя
 * сигнатуры интерфейса. Точка замены — экспорт `authBackend` внизу файла.
 */

import { supabase } from '@/lib/supabase'
import { getInitDataRaw, isTelegramEnv } from '@/lib/telegram'
import type { DriverVerificationStatus, User, UserRole } from '@/types/db'

export interface AuthBackend {
  /** Boot/авторизация: вернуть текущего пользователя (создав при первом входе). */
  authenticate(): Promise<User>
  /** Частичное обновление профиля (ИСУ, привязка ITMO ID, описание и т.п.). */
  updateProfile(patch: Partial<User>): Promise<User>
  /** Сброс сессии (для дев-режима / повторного прохождения флоу). */
  signOut(): Promise<void>
}

// --- Мок-реализация (шаг 3a) ---------------------------------------------

const MOCK_STORAGE_KEY = 'podvezi.mock.user'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function storeUser(user: User): void {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user))
}

function createMockUser(): User {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    telegram_id: 100_000_000 + Math.floor(Math.random() * 900_000_000),
    telegram_username: 'dev_user',
    full_name: null,
    isu_number: null,
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createMockAuthBackend(): AuthBackend {
  return {
    async authenticate() {
      await delay(700) // имитация авторизации через Telegram
      const existing = loadStoredUser()
      if (existing) return existing
      const user = createMockUser()
      storeUser(user)
      return user
    },

    async updateProfile(patch) {
      await delay(300)
      const current = loadStoredUser() ?? createMockUser()
      const updated: User = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      }
      storeUser(updated)
      return updated
    },

    async signOut() {
      localStorage.removeItem(MOCK_STORAGE_KEY)
    },
  }
}

/**
 * DEV-only: подменяет статус верификации мок-пользователя в localStorage,
 * чтобы локально прокликать водительский флоу без Telegram/админа.
 * В Supabase-режиме статус ставит только админ (см. architecture.md 5.1.1).
 */
export function devSetMockDriverStatus(status: DriverVerificationStatus): void {
  const user = loadStoredUser()
  if (!user) return
  storeUser({
    ...user,
    driver_verification_status: status,
    updated_at: new Date().toISOString(),
  })
}

/**
 * DEV-only: подменяет роль мок-пользователя в localStorage (для проверки
 * админ-панели локально). В Supabase-режиме роль `admin` назначается в БД.
 */
export function devSetMockRole(role: UserRole): void {
  const user = loadStoredUser()
  if (!user) return
  storeUser({ ...user, role, updated_at: new Date().toISOString() })
}

// --- Supabase-реализация (шаг 3b) ----------------------------------------

interface TelegramAuthResponse {
  access_token: string
  refresh_token: string
  is_new_user: boolean
}

function createSupabaseAuthBackend(): AuthBackend {
  return {
    async authenticate() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      let activeSession = session

      if (!activeSession) {
        const initDataRaw = getInitDataRaw()
        if (!initDataRaw) {
          throw new Error('Откройте приложение из Telegram')
        }
        const { data, error } = await supabase.functions.invoke<TelegramAuthResponse>(
          'telegram-auth',
          { body: { initDataRaw } },
        )
        if (error || !data) {
          throw new Error('Не удалось авторизоваться через Telegram')
        }
        const { data: setData, error: setError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        if (setError || !setData.session) {
          throw new Error('Не удалось установить сессию')
        }
        activeSession = setData.session
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', activeSession.user.id)
        .single()
      if (profileError || !profile) {
        throw new Error('Не удалось загрузить профиль')
      }
      return profile as User
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

    async signOut() {
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
