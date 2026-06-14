import { useEffect, useState } from 'react'
import { AppScreen } from '@/components/AppScreen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { Spinner } from '@/components/ui/spinner'
import { getCoTravelerContact, getPublicProfile } from '@/services/trips'
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

/** Профиль на экране: полный (с контактами) или публичный (без них). */
type ProfileView = Partial<CoTravelerContact> &
  Pick<CoTravelerContact, 'full_name' | 'avatar_url' | 'course'> & {
    /** Контакты доступны только подтверждённому попутчику (ТЗ 5.5.1). */
    hasContacts: boolean
  }

/**
 * Профиль водителя (5.5.1) — открывается по клику на ФИО водителя в
 * карточке поездки (главный экран и «Мои поездки»). Контакты (Telegram)
 * видны только подтверждённому пассажиру его поездки; остальным — только
 * публичный профиль.
 */
export function CoTravelerProfileScreen({
  userId,
  onBack,
}: {
  userId: string
  onBack: () => void
}) {
  const [profile, setProfile] = useState<ProfileView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const contact = await getCoTravelerContact(userId)
      if (contact) return { ...contact, hasContacts: true } satisfies ProfileView
      const publicProfile = await getPublicProfile(userId)
      if (!publicProfile) return null
      return { ...publicProfile, hasContacts: false } satisfies ProfileView
    }
    load()
      .then((data) => {
        if (active) setProfile(data)
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
      <ScreenHeader title="Профиль водителя" onBack={onBack} />

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Загрузка…
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-danger-foreground">{error}</p>
      ) : !profile ? (
        <p className="mt-6 text-sm text-muted-foreground">Профиль недоступен</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col items-center gap-3 text-center">
            <Avatar url={profile.avatar_url} name={profile.full_name} className="size-20" />
            <p className="text-lg font-semibold text-foreground">
              {profile.full_name ?? 'Студент ИТМО'}
            </p>
          </div>

          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card px-4">
            {profile.course != null && <InfoRow label="Курс" value={`${profile.course}`} />}
            {profile.age != null && <InfoRow label="Возраст" value={`${profile.age}`} />}
            {profile.telegram_username && (
              <InfoRow label="Telegram" value={`@${profile.telegram_username}`} />
            )}
          </div>

          {profile.description && (
            <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p>
          )}

          {!profile.hasContacts && (
            <p className="mt-4 text-sm text-muted-foreground">
              Контакты станут видны после подтверждения вашей заявки водителем
            </p>
          )}
        </>
      )}
    </AppScreen>
  )
}
