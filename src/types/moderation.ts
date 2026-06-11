import type { DocumentType } from '@/types/db'

/** Документ заявки с подписанной ссылкой для просмотра админом. */
export interface ReviewDocument {
  id: string
  type: DocumentType
  side: 'front' | 'back' | null
  url: string | null
}

/** Данные автомобиля в заявке. */
export interface ReviewVehicle {
  make: string
  model: string
  plateNumber: string
  color: string | null
  seatsCount: number
}

/** Заявка водителя для рассмотрения администратором (экран модерации). */
export interface DriverApplicationReview {
  requestId: string
  createdAt: string
  applicant: {
    id: string
    fullName: string | null
    course: number | null
    age: number | null
    isuNumber: string | null
    telegramUsername: string | null
  }
  vehicle: ReviewVehicle | null
  documents: ReviewDocument[]
}
