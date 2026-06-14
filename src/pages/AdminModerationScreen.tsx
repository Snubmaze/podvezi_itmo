import { useState } from 'react'

import { AppScreen } from '@/components/AppScreen'
import { ImageLightbox } from '@/components/ImageLightbox'
import { Modal } from '@/components/Modal'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { usePendingApplications } from '@/hooks/usePendingApplications'
import {
  approveDriverApplication,
  rejectDriverApplication,
} from '@/services/moderation'
import type { DriverApplicationReview, ReviewDocument } from '@/types/moderation'

function DocThumb({
  doc,
  onOpen,
}: {
  doc: ReviewDocument
  onOpen: (doc: ReviewDocument, label: string) => void
}) {
  const label = `${doc.type === 'license' ? 'ВУ' : 'СТС'} · ${
    doc.side === 'front' ? 'лицевая' : doc.side === 'back' ? 'задняя' : '—'
  }`
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {doc.url ? (
        <button type="button" onClick={() => onOpen(doc, label)} className="block w-full">
          <img
            src={doc.url}
            alt={label}
            className="aspect-[3/2] w-full rounded-lg border border-border object-cover"
          />
        </button>
      ) : (
        <div className="flex aspect-[3/2] w-full items-center justify-center rounded-lg border border-border bg-muted text-xs text-tertiary">
          нет фото
        </div>
      )}
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function ApplicationCard({
  review,
  onResolved,
}: {
  review: DriverApplicationReview
  onResolved: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null)

  const { applicant, vehicle } = review

  const handleApprove = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await approveDriverApplication(review.requestId, applicant.id)
      onResolved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подтвердить')
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await rejectDriverApplication(review.requestId, applicant.id, reason.trim())
      setRejectOpen(false)
      onResolved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отклонить')
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-base font-semibold text-foreground">
        {applicant.fullName ?? 'Без имени'}
      </p>
      <div className="mt-2 space-y-1">
        {applicant.course != null && (
          <InfoLine label="Курс" value={`${applicant.course}`} />
        )}
        {applicant.age != null && (
          <InfoLine label="Возраст" value={`${applicant.age}`} />
        )}
        {applicant.isuNumber && (
          <InfoLine label="ИСУ" value={applicant.isuNumber} />
        )}
        {applicant.telegramUsername && (
          <InfoLine label="Telegram" value={`@${applicant.telegramUsername}`} />
        )}
      </div>

      {vehicle && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <InfoLine label="Авто" value={`${vehicle.make} ${vehicle.model}`} />
          <InfoLine label="Госномер" value={vehicle.plateNumber} />
          {vehicle.color && <InfoLine label="Цвет" value={vehicle.color} />}
          <InfoLine label="Мест" value={`${vehicle.seatsCount}`} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        {review.documents.map((doc) => (
          <DocThumb
            key={doc.id}
            doc={doc}
            onOpen={(d, label) => d.url && setPreview({ url: d.url, label })}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger-foreground">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={handleApprove} disabled={submitting}>
          {submitting && <Spinner className="size-4 text-primary-foreground" />}
          Подтвердить
        </Button>
        <Button
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={submitting}
        >
          Отклонить
        </Button>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Причина отклонения"
      >
        <div className="space-y-3">
          <Textarea
            placeholder="Опишите причину отклонения заявки"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleReject}
            disabled={submitting || !reason.trim()}
          >
            {submitting && <Spinner className="size-4" />}
            Отклонить заявку
          </Button>
        </div>
      </Modal>

      <ImageLightbox
        src={preview?.url ?? null}
        alt={preview?.label ?? ''}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}

/** Админ-панель модерации заявок водителей (ТЗ 4.4, шаг 8). */
export function AdminModerationScreen({ onBack }: { onBack: () => void }) {
  const { applications, loading, error, refetch } = usePendingApplications()

  return (
    <AppScreen>
      <ScreenHeader title="Модерация заявок" onBack={onBack} />

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Загрузка заявок…
          </div>
        ) : error ? (
          <p className="text-sm text-danger-foreground">{error}</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Заявок на проверку нет</p>
        ) : (
          applications.map((review) => (
            <ApplicationCard
              key={review.requestId}
              review={review}
              onResolved={refetch}
            />
          ))
        )}
      </div>
    </AppScreen>
  )
}
