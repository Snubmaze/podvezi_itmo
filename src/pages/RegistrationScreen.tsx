import { useState, type FormEvent } from 'react'

import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'

/** Формат номера ИСУ: только цифры, 4–10 знаков. */
const ISU_PATTERN = /^\d{4,10}$/

/**
 * Экран входа по номеру ИСУ (аккаунт = ИСУ; см. architecture.md 5.1). При
 * первом входе аккаунт создаётся, при повторном — открывается существующий.
 */
export function RegistrationScreen() {
  const { loginWithIsu } = useAuth()
  const [isu, setIsu] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const value = isu.trim()
    if (!ISU_PATTERN.test(value)) {
      setError('Номер ИСУ — только цифры (4–10 знаков)')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await loginWithIsu(value)
      // Дальше флоу сам переключится (ITMO ID или главный экран).
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="size-16 rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Вход</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Введите номер ИСУ, чтобы войти. При первом входе создадим аккаунт,
            данные подтянем из ITMO ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="isu" className="px-1">
              Номер ИСУ
            </Label>
            <Input
              id="isu"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Например, 412345"
              value={isu}
              aria-invalid={error != null}
              onChange={(event) => {
                setIsu(event.target.value)
                if (error) setError(null)
              }}
            />
            {error && <p className="px-1 text-sm text-danger-foreground">{error}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-xl"
            disabled={submitting}
          >
            {submitting && <Spinner className="size-4 text-primary-foreground" />}
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}
