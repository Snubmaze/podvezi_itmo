import { useState, type FormEvent } from 'react'

import { AppScreen } from '@/components/AppScreen'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'

/** Формат номера ИСУ: только цифры, 4–10 знаков. */
const ISU_PATTERN = /^\d{4,10}$/

/**
 * Экран регистрации нового пользователя (ТЗ 6.2, упрощённый): только поле
 * «Номер ИСУ». ФИО здесь не запрашивается — оно придёт из мок ITMO ID.
 */
export function RegistrationScreen() {
  const { setIsuNumber } = useAuth()
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
      await setIsuNumber(value)
      // Дальше флоу сам переключится на экран входа через ITMO ID.
    } catch {
      setError('Не удалось сохранить номер ИСУ. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <AppScreen>
      <div className="flex flex-col gap-2 pt-4">
        <BrandMark />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Регистрация</h1>
        <p className="text-sm text-muted-foreground">
          Укажите ваш номер ИСУ, чтобы продолжить. Остальные данные подтянем
          из ITMO ID на следующем шаге.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
        <div className="space-y-2">
          <Label htmlFor="isu">Номер ИСУ</Label>
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
          {error && <p className="text-sm text-danger-foreground">{error}</p>}
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-auto w-full"
          disabled={submitting}
        >
          {submitting && <Spinner className="size-4 text-primary-foreground" />}
          Продолжить
        </Button>
      </form>
    </AppScreen>
  )
}
