import { createContext } from 'react'

import type { User } from '@/types/db'
import type { ItmoIdProfile } from '@/services/itmoId'

export type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'needs-isu' } // сессии нет — нужен ввод номера ИСУ (вход)
  | { status: 'ready'; user: User }

export interface AuthContextValue {
  state: AuthState
  /** Повторить авторизацию после ошибки. */
  retry: () => void
  /** Вход по номеру ИСУ (аккаунт = ИСУ; см. architecture.md 5.1). */
  loginWithIsu: (isu: string) => Promise<void>
  /** Привязать профиль ITMO ID (мок-вход) и выставить itmo_id_linked. */
  linkItmoId: (profile: ItmoIdProfile) => Promise<void>
  /** Обновить редактируемое поле «Описание» (ТЗ 5.8). */
  updateDescription: (description: string) => Promise<void>
  /** Перечитать профиль из источника (после подачи заявки на верификацию и т.п.). */
  reloadUser: () => Promise<void>
  /** Выход из аккаунта: завершить сессию и вернуться к вводу ИСУ. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
