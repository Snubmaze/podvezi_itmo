import type { ModerationStatus } from '@/types/db'

/** Данные заявки на верификацию водителя (экран 6.4). */
export interface DriverApplicationInput {
  make: string
  model: string
  plateNumber: string
  color: string
  seatsCount: number
  licenseFrontFile: File
  licenseBackFile: File
  stsFrontFile: File
  stsBackFile: File
}

/** Краткая сводка последней заявки на верификацию (для статуса/причины). */
export interface DriverApplicationSummary {
  status: ModerationStatus
  comment: string | null
  createdAt: string
}
