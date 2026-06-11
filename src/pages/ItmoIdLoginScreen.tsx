import { useState, type FormEvent } from 'react'

import { AppScreen } from '@/components/AppScreen'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { fetchItmoIdProfile } from '@/services/itmoId'

/**
 * Экран входа через ITMO ID (мок). Любые непустые логин/пароль считаются
 * успешным входом; данные профиля (ФИО, курс, возраст, аватар) приходят из
 * мок-сервиса и сохраняются в users (itmo_id_linked = true).
 */
export function ItmoIdLoginScreen() {
  const { linkItmoId } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { login?: string; password?: string } = {}
    if (login.trim() === '') nextErrors.login = 'Заполните поле'
    if (password.trim() === '') nextErrors.password = 'Заполните поле'
    setErrors(nextErrors)
    if (nextErrors.login || nextErrors.password) return

    setFormError(null)
    setSubmitting(true)
    try {
      const profile = await fetchItmoIdProfile(login, password)
      await linkItmoId(profile)
      // Флоу переключится на главный экран пассажира.
    } catch {
      setFormError('Не удалось войти через ITMO ID. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <AppScreen>
      <div className="flex flex-col gap-2 pt-4">
        <BrandMark />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Вход через ITMO ID</h1>
        <p className="text-sm text-muted-foreground">
          Войдите с учётной записью ITMO ID, чтобы подтянуть ваш профиль (ФИО,
          курс, фото).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="login">Логин</Label>
          <Input
            id="login"
            autoComplete="username"
            placeholder="Логин ITMO ID"
            value={login}
            aria-invalid={errors.login != null}
            onChange={(event) => {
              setLogin(event.target.value)
              if (errors.login) setErrors((e) => ({ ...e, login: undefined }))
            }}
          />
          {errors.login && (
            <p className="text-sm text-danger-foreground">{errors.login}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            aria-invalid={errors.password != null}
            onChange={(event) => {
              setPassword(event.target.value)
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }))
            }}
          />
          {errors.password && (
            <p className="text-sm text-danger-foreground">{errors.password}</p>
          )}
        </div>

        {formError && <p className="text-sm text-danger-foreground">{formError}</p>}

        <p className="text-xs text-tertiary">
          Демо-режим: вход имитируется, реальный запрос в ITMO ID не
          выполняется.
        </p>

        <Button
          type="submit"
          size="lg"
          className="mt-auto w-full"
          disabled={submitting}
        >
          {submitting && <Spinner className="size-4 text-primary-foreground" />}
          Войти
        </Button>
      </form>
    </AppScreen>
  )
}
