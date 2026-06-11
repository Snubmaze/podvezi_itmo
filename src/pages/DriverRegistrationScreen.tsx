import { useState, type FormEvent } from 'react'
import { Check, ChevronLeft, Upload } from 'lucide-react'

import { AppScreen } from '@/components/AppScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { submitDriverVerification } from '@/services/driver'
import type { User } from '@/types/db'

/** Цвет — только буквы (кириллица/латиница), пробелы и дефис. */
const COLOR_PATTERN = /^[A-Za-zА-Яа-яЁё\s-]+$/

/** Поле загрузки фото документа. */
function FileField({
  id,
  label,
  file,
  onChange,
}: {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm"
      >
        {file ? (
          <>
            <Check className="size-4 shrink-0 text-success-foreground" />
            <span className="truncate text-foreground">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="size-4 shrink-0 text-tertiary" />
            <span className="text-tertiary">Выберите фото</span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  )
}

/**
 * Экран регистрации/верификации водителя (ТЗ 6.4): данные авто + фото ВУ/СТС.
 * Отправка создаёт заявку на модерацию и переводит статус в pending.
 */
export function DriverRegistrationScreen({
  user,
  onBack,
  onSubmitted,
}: {
  user: User
  onBack: () => void
  onSubmitted: () => void
}) {
  const { reloadUser } = useAuth()
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [color, setColor] = useState('')
  const [seats, setSeats] = useState('4')
  const [licenseFront, setLicenseFront] = useState<File | null>(null)
  const [licenseBack, setLicenseBack] = useState<File | null>(null)
  const [stsFront, setStsFront] = useState<File | null>(null)
  const [stsBack, setStsBack] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const seatsNum = Number(seats)
    if (!make.trim() || !model.trim() || !plate.trim()) {
      setError('Заполните марку, модель и госномер')
      return
    }
    if (!color.trim()) {
      setError('Укажите цвет автомобиля')
      return
    }
    if (!COLOR_PATTERN.test(color.trim())) {
      setError('Цвет — только буквы (без цифр)')
      return
    }
    if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 8) {
      setError('Число мест — от 1 до 8')
      return
    }
    if (!licenseFront || !licenseBack || !stsFront || !stsBack) {
      setError('Загрузите обе стороны ВУ и СТС (4 фото)')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitDriverVerification(user.id, {
        make: make.trim(),
        model: model.trim(),
        plateNumber: plate.trim(),
        color: color.trim(),
        seatsCount: seatsNum,
        licenseFrontFile: licenseFront,
        licenseBackFile: licenseBack,
        stsFrontFile: stsFront,
        stsBackFile: stsBack,
      })
      await reloadUser()
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
      setSubmitting(false)
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
        <h1 className="text-lg font-semibold text-foreground">Заявка водителя</h1>
      </header>

      <p className="mt-2 text-sm text-muted-foreground">
        Укажите данные автомобиля и загрузите документы — заявку проверит
        модератор.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">Марка</Label>
          <Input
            id="make"
            placeholder="Например, Lada"
            value={make}
            onChange={(e) => setMake(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Модель</Label>
          <Input
            id="model"
            placeholder="Например, Vesta"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plate">Госномер</Label>
          <Input
            id="plate"
            placeholder="А123ВС 178"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="color">Цвет</Label>
            <Input
              id="color"
              placeholder="Белый"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Число мест</Label>
            <Input
              id="seats"
              type="number"
              inputMode="numeric"
              min={1}
              max={8}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
        </div>

        <FileField
          id="license-front"
          label="ВУ — лицевая сторона"
          file={licenseFront}
          onChange={setLicenseFront}
        />
        <FileField
          id="license-back"
          label="ВУ — задняя сторона"
          file={licenseBack}
          onChange={setLicenseBack}
        />
        <FileField
          id="sts-front"
          label="СТС — лицевая сторона"
          file={stsFront}
          onChange={setStsFront}
        />
        <FileField
          id="sts-back"
          label="СТС — задняя сторона"
          file={stsBack}
          onChange={setStsBack}
        />

        {error && <p className="text-sm text-danger-foreground">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting}
        >
          {submitting && <Spinner className="size-4 text-primary-foreground" />}
          Отправить на проверку
        </Button>
      </form>
    </AppScreen>
  )
}
