/**
 * Доменный сервис верификации водителя (шаг 7). Контракт — architecture.md 5.6.
 * Использует существующие таблицы `vehicles`/`driver_documents`/
 * `moderation_requests` и приватный bucket `driver-documents`.
 */

import { supabase } from '@/lib/supabase'
import { isTelegramEnv } from '@/lib/telegram'
import { devSetMockDriverStatus } from '@/services/auth'
import type { DocumentType } from '@/types/db'
import type {
  DriverApplicationInput,
  DriverApplicationSummary,
} from '@/types/driver'

const DOCUMENTS_BUCKET = 'driver-documents'

/** Загружает файл документа в приватный bucket, возвращает путь. */
async function uploadDocument(
  userId: string,
  type: DocumentType,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${type}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: false })
  if (error) throw new Error('Не удалось загрузить документ')
  return path
}

/**
 * Подаёт заявку на верификацию водителя: авто + документы + заявка модерации,
 * статус пользователя → pending. В мок-режиме (браузер без Telegram) реальные
 * записи невозможны — имитируем переход в pending.
 */
export async function submitDriverVerification(
  userId: string,
  input: DriverApplicationInput,
): Promise<void> {
  if (!isTelegramEnv()) {
    devSetMockDriverStatus('pending')
    await new Promise((resolve) => setTimeout(resolve, 400))
    return
  }

  const licensePath = await uploadDocument(userId, 'license', input.licenseFile)
  const stsPath = await uploadDocument(userId, 'sts', input.stsFile)

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      driver_id: userId,
      make: input.make,
      model: input.model,
      plate_number: input.plateNumber,
      color: input.color,
      seats_count: input.seatsCount,
    })
    .select('id')
    .single()
  if (vehicleError || !vehicle) {
    throw new Error('Не удалось сохранить данные автомобиля')
  }

  const { error: documentsError } = await supabase.from('driver_documents').insert([
    { driver_id: userId, document_type: 'license', file_path: licensePath },
    { driver_id: userId, document_type: 'sts', file_path: stsPath },
  ])
  if (documentsError) throw new Error('Не удалось сохранить документы')

  const { error: moderationError } = await supabase
    .from('moderation_requests')
    .insert({
      requester_id: userId,
      type: 'driver_verification',
      payload: { vehicle_id: vehicle.id },
    })
  if (moderationError) throw new Error('Не удалось создать заявку на модерацию')

  const { error: statusError } = await supabase
    .from('users')
    .update({ driver_verification_status: 'pending' })
    .eq('id', userId)
  if (statusError) throw new Error('Не удалось обновить статус верификации')
}

/**
 * Последняя заявка на верификацию (статус + причина отклонения).
 * В мок-режиме возвращает null (реальных заявок нет).
 */
export async function getDriverApplication(
  userId: string,
): Promise<DriverApplicationSummary | null> {
  if (!isTelegramEnv()) return null

  const { data, error } = await supabase
    .from('moderation_requests')
    .select('status, comment, created_at')
    .eq('requester_id', userId)
    .eq('type', 'driver_verification')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null

  return {
    status: data.status,
    comment: data.comment,
    createdAt: data.created_at,
  }
}
