import { useState, type FormEvent } from 'react'
import { ChevronDown, Eye, EyeOff, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'

/**
 * Экран входа через ITMO ID (мок) — единственный экран входа (аккаунт = логин,
 * см. architecture.md 5.1). Любые непустые логин/пароль = успех; профиль (ФИО,
 * курс, возраст, аватар) приходит из мок-сервиса, номер ИСУ генерируется при
 * создании аккаунта. Тот же логин → тот же аккаунт.
 * Соц-кнопки (VK/Яндекс) и «Забыли пароль?» — некликабельные заглушки.
 */
export function ItmoIdLoginScreen() {
  const { loginWithItmoId } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      await loginWithItmoId(login, password)
      // Флоу переключится на главный экран.
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Не удалось войти через ITMO ID. Попробуйте ещё раз.',
      )
      setSubmitting(false)
    }
  }

  const fieldClass = 'h-12 rounded-xl border-transparent bg-muted pr-11'

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-foreground">ITMO ID</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <div className="relative">
              <Input
                id="login"
                autoComplete="username"
                placeholder="Логин"
                value={login}
                aria-invalid={errors.login != null}
                className={fieldClass}
                onChange={(event) => {
                  setLogin(event.target.value)
                  if (errors.login) setErrors((e) => ({ ...e, login: undefined }))
                }}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-0.5 text-muted-foreground">
                <KeyRound className="size-4" />
                <ChevronDown className="size-3.5" />
              </div>
            </div>
            {errors.login && (
              <p className="px-1 text-sm text-danger-foreground">{errors.login}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                aria-invalid={errors.password != null}
                className={fieldClass}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }))
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground outline-none hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="px-1 text-sm text-danger-foreground">{errors.password}</p>
            )}
          </div>

          {/* «Забыли пароль?» — некликабельная заглушка */}
          <div className="flex justify-end">
            <span className="cursor-default text-sm font-medium text-primary">
              Забыли пароль?
            </span>
          </div>

          {formError && <p className="text-sm text-danger-foreground">{formError}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            {submitting && <Spinner className="size-4 text-background" />}
            Вход
          </Button>
        </form>

        {/* Соц-вход — некликабельные заглушки */}
        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">или войдите с помощью</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-4 flex justify-center gap-3" aria-hidden="true">
          {/* Бренд-цвета VK/Яндекс — вне токенов дизайн-системы (заглушки) */}
          <span
            className="flex size-11 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: '#0077FF' }}
          >
            VK
          </span>
          <span
            className="flex size-11 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: '#FC3F1D' }}
          >
            Я
          </span>
        </div>
      </div>
    </div>
  )
}
