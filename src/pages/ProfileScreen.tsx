import { useEffect, useState } from 'react'
import { ChevronLeft, LogOut } from 'lucide-react'

import { AppScreen } from '@/components/AppScreen'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { verificationBadge } from '@/lib/verification'
import { devSetMockDriverStatus } from '@/services/auth'
import { getDriverApplication } from '@/services/driver'
import type { User } from '@/types/db'

/** Строка «только для чтения» (данные из ITMO ID / Telegram). */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ProfileScreen({
  user,
  onBack,
}: {
  user: User
  onBack: () => void
}) {
  const { updateDescription, signOut, retry } = useAuth()
  const [description, setDescription] = useState(user.description ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = description !== (user.description ?? '')
  const badge = verificationBadge(user.driver_verification_status)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)

  // Причина отклонения (если админ её указал — шаг 8).
  useEffect(() => {
    if (user.driver_verification_status !== 'rejected') return
    let active = true
    getDriverApplication(user.id)
      .then((app) => {
        if (active && app?.comment) setRejectionReason(app.comment)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user.driver_verification_status, user.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDescription(description)
    } finally {
      setSaving(false)
    }
  }

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
        <h1 className="text-lg font-semibold text-foreground">Профиль</h1>
      </header>

      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        <Avatar url={user.avatar_url} name={user.full_name} className="size-20" />
        <div>
          <p className="text-lg font-semibold text-foreground">
            {user.full_name ?? 'Студент ИТМО'}
          </p>
          <div className="mt-1.5 flex justify-center">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          {user.driver_verification_status === 'rejected' && rejectionReason && (
            <p className="mt-2 text-sm text-danger-foreground">
              Причина: {rejectionReason}
            </p>
          )}
        </div>
      </div>

      {/* Данные из ITMO ID / Telegram — нередактируемые */}
      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card px-4">
        {user.course != null && (
          <InfoRow label="Курс" value={`${user.course}`} />
        )}
        {user.age != null && <InfoRow label="Возраст" value={`${user.age}`} />}
        {user.isu_number && (
          <InfoRow label="Номер ИСУ" value={user.isu_number} />
        )}
        {user.telegram_username && (
          <InfoRow label="Telegram" value={`@${user.telegram_username}`} />
        )}
      </div>
      <p className="mt-2 px-1 text-xs text-tertiary">
        ФИО, курс, возраст и фото получены из ITMO ID и не редактируются.
      </p>

      {/* Редактируемое описание (ТЗ 5.8) */}
      <div className="mt-6 space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          placeholder="Расскажите о себе (необязательно)"
          value={description}
          maxLength={300}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving && <Spinner className="size-4 text-primary-foreground" />}
          Сохранить
        </Button>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        {import.meta.env.DEV && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              const isApproved = user.driver_verification_status === 'approved'
              devSetMockDriverStatus(isApproved ? 'none' : 'approved')
              retry()
            }}
          >
            {user.driver_verification_status === 'approved'
              ? 'Снять статус водителя (дев)'
              : 'Стать водителем (дев)'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="w-full text-destructive"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Выйти
        </Button>
      </div>
    </AppScreen>
  )
}
