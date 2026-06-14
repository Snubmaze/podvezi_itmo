import { createContext } from 'react'

import type { User } from '@/types/db'

export type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'needs-login' } // сессии нет — нужен вход через ITMO ID
  | { status: 'ready'; user: User }

export interface AuthContextValue {
  state: AuthState
  /** Повторить авторизацию после ошибки. */
  retry: () => void
  /** Вход через ITMO ID (логин+пароль; аккаунт = логин; см. architecture.md 5.1). */
  loginWithItmoId: (login: string, password: string) => Promise<void>
  /** Обновить редактируемое поле «Описание» (ТЗ 5.8). */
  updateDescription: (description: string) => Promise<void>
  /** Перечитать профиль из источника (после подачи заявки на верификацию и т.п.). */
  reloadUser: () => Promise<void>
  /** Выход из аккаунта: завершить сессию и вернуться к входу ITMO ID. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
