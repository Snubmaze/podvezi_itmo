import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

import { AppScreen } from '@/components/AppScreen'
import { Avatar } from '@/components/Avatar'
import { Spinner } from '@/components/ui/spinner'
import { getCoTravelerContact } from '@/services/trips'
import type { CoTravelerContact } from '@/types/trips'

/** Строка «только для чтения». */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

/**
 * Профиль водителя с контактами (5.5.1) — доступен подтверждённому
 * пассажиру его поездки, открывается по клику на ФИО водителя в
 * «Мои поездки».
 */
export function CoTravelerProfileScreen({
  userId,
  onBack,
}: {
  userId: string
  onBack: () => void
}) {
  const [contact, setContact] = useState<CoTravelerContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCoTravelerContact(userId)
      .then((data) => {
        if (active) setContact(data)
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  return (
    <AppScreen>
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="-ml-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Профиль водителя</h1>
      </header>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Загрузка…
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-danger-foreground">{error}</p>
      ) : !contact ? (
        <p className="mt-6 text-sm text-muted-foreground">Профиль недоступен</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col items-center gap-3 text-center">
            <Avatar url={contact.avatarUrl} name={contact.fullName} className="size-20" />
            <p className="text-lg font-semibold text-foreground">
              {contact.fullName ?? 'Студент ИТМО'}
            </p>
          </div>

          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card px-4">
            {contact.course != null && <InfoRow label="Курс" value={`${contact.course}`} />}
            {contact.age != null && <InfoRow label="Возраст" value={`${contact.age}`} />}
            {contact.telegramUsername && (
              <InfoRow label="Telegram" value={`@${contact.telegramUsername}`} />
            )}
          </div>

          {contact.description && (
            <p className="mt-4 text-sm text-muted-foreground">{contact.description}</p>
          )}
        </>
      )}
    </AppScreen>
  )
}
