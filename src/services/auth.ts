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

import type { User } from '@/types/db'

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
 * Активный backend авторизации.
 * Шаг 3b заменит мок на Supabase-реализацию здесь.
 */
export const authBackend: AuthBackend = createMockAuthBackend()
