import { Modal } from '@/components/Modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { verificationBadge } from '@/lib/verification'
import type { DriverVerificationStatus } from '@/types/db'

/**
 * Модалка верификации водителя. Содержимое зависит от статуса.
 * Кнопка «Подать заявку» ведёт на экран регистрации водителя (`onApply`).
 * См. architecture.md 5.1.1 / 5.6.
 */
export function DriverVerificationModal({
  open,
  onClose,
  status,
  onApply,
}: {
  open: boolean
  onClose: () => void
  status: DriverVerificationStatus
  onApply: () => void
}) {
  const badge = verificationBadge(status)

  const title =
    status === 'pending'
      ? 'Заявка на проверке'
      : status === 'rejected'
        ? 'Заявка отклонена'
        : 'Стать водителем'

  return (
    <Modal open={open} onClose={onClose} title={title}>
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

        {status !== 'pending' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onClose()
              onApply()
            }}
          >
            {status === 'rejected' ? 'Подать заявку снова' : 'Подать заявку'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
