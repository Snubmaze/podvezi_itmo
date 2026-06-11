import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from '@/app/auth-context'

/** Доступ к состоянию авторизации и действиям профиля. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return context
}
