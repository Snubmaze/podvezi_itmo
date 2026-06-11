import { useState } from 'react'

import { Modal } from '@/components/Modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { verificationBadge } from '@/lib/verification'
import type { DriverVerificationStatus } from '@/types/db'

/**
 * Модалка верификации водителя. Содержимое зависит от статуса.
 * На шаге 4 кнопка «Подать заявку» — UI-заглушка (полная форма: данные авто
 * + загрузка документов — шаг 7). См. architecture.md 5.1.1.
 */
export function DriverVerificationModal({
  open,
  onClose,
  status,
}: {
  open: boolean
  onClose: () => void
  status: DriverVerificationStatus
}) {
  const [stubNotice, setStubNotice] = useState(false)
  const badge = verificationBadge(status)

  const title =
    status === 'pending'
      ? 'Заявка на проверке'
      : status === 'rejected'
        ? 'Заявка отклонена'
        : 'Стать водителем'

  const handleClose = () => {
    setStubNotice(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <Badge variant={badge.variant}>{badge.label}</Badge>

        {status === 'pending' ? (
          <p className="text-sm text-muted-foreground">
            Ваша заявка на верификацию рассматривается модератором. Как только
            её одобрят, режим водителя станет доступен.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Чтобы создавать поездки, пройдите верификацию: укажите данные
            автомобиля и загрузите документы (водительское удостоверение, СТС).
            Заявку проверит модератор.
          </p>
        )}

        {stubNotice && (
          <p className="rounded-lg bg-warning-muted px-3 py-2 text-sm text-warning-foreground">
            Полная форма заявки (данные авто и загрузка документов) появится на
            следующем шаге.
          </p>
        )}

        {status !== 'pending' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => setStubNotice(true)}
          >
            {status === 'rejected' ? 'Подать заявку снова' : 'Подать заявку'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
