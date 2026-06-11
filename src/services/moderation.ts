/**
 * Доменный сервис админ-модерации (шаг 8). Контракт — architecture.md 5.7.
 * Доступ к данным защищён RLS (только `is_admin()`); UI показывается лишь
 * пользователю с `role='admin'`.
 *
 * В мок-режиме (браузер без Telegram) реальных данных нет — отдаём набор
 * демо-заявок из памяти, чтобы прокликать панель.
 */

import { supabase } from '@/lib/supabase'
import { isTelegramEnv } from '@/lib/telegram'
import type { DriverApplicationReview } from '@/types/moderation'

const DOCUMENTS_BUCKET = 'driver-documents'
const SIGNED_URL_TTL = 60 * 60 // 1 час

function parseSide(path: string): 'front' | 'back' | null {
  const file = path.split('/').pop() ?? ''
  if (file.startsWith('front')) return 'front'
  if (file.startsWith('back')) return 'back'
  return null
}

interface RawRequest {
  id: string
  created_at: string
  requester_id: string
  payload: { vehicle_id?: string } | null
  requester: {
    id: string
    full_name: string | null
    course: number | null
    age: number | null
    isu_number: string | null
    telegram_username: string | null
  } | null
}

interface RawVehicle {
  make: string
  model: string
  plate_number: string
  color: string | null
  seats_count: number
}

interface RawDocument {
  id: string
  document_type: 'license' | 'sts'
  file_path: string
}

/** Заявки водителей со статусом «На проверке» (с авто и документами). */
export async function getPendingDriverApplications(): Promise<
  DriverApplicationReview[]
> {
  if (!isTelegramEnv()) return getMockApplications()

  const { data, error } = await supabase
    .from('moderation_requests')
    .select(
      'id, created_at, requester_id, payload, requester:users!requester_id(id, full_name, course, age, isu_number, telegram_username)',
    )
    .eq('type', 'driver_verification')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error('Не удалось загрузить заявки на модерацию')

  const requests = (data ?? []) as unknown as RawRequest[]
  const reviews: DriverApplicationReview[] = []

  for (const req of requests) {
    const vehicleId = req.payload?.vehicle_id ?? null
    let vehicle: DriverApplicationReview['vehicle'] = null
    if (vehicleId) {
      const { data: v } = await supabase
        .from('vehicles')
        .select('make, model, plate_number, color, seats_count')
        .eq('id', vehicleId)
        .maybeSingle()
      const raw = v as RawVehicle | null
      if (raw) {
        vehicle = {
          make: raw.make,
          model: raw.model,
          plateNumber: raw.plate_number,
          color: raw.color,
          seatsCount: raw.seats_count,
        }
      }
    }

    const { data: docsData } = await supabase
      .from('driver_documents')
      .select('id, document_type, file_path')
      .eq('driver_id', req.requester_id)
    const docs = (docsData ?? []) as RawDocument[]

    const urlByPath = new Map<string, string>()
    if (docs.length) {
      const { data: signed } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrls(
          docs.map((d) => d.file_path),
          SIGNED_URL_TTL,
        )
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
      })
    }

    reviews.push({
      requestId: req.id,
      createdAt: req.created_at,
      applicant: {
        id: req.requester?.id ?? req.requester_id,
        fullName: req.requester?.full_name ?? null,
        course: req.requester?.course ?? null,
        age: req.requester?.age ?? null,
        isuNumber: req.requester?.isu_number ?? null,
        telegramUsername: req.requester?.telegram_username ?? null,
      },
      vehicle,
      documents: docs.map((d) => ({
        id: d.id,
        type: d.document_type,
        side: parseSide(d.file_path),
        url: urlByPath.get(d.file_path) ?? null,
      })),
    })
  }

  return reviews
}

async function currentAdminId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Подтвердить заявку: статус → approved у заявки, пользователя и документов. */
export async function approveDriverApplication(
  requestId: string,
  applicantId: string,
): Promise<void> {
  if (!isTelegramEnv()) {
    removeMockApplication(requestId)
    return
  }
  const now = new Date().toISOString()
  const reviewerId = await currentAdminId()

  const { error: reqErr } = await supabase
    .from('moderation_requests')
    .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: now })
    .eq('id', requestId)
  if (reqErr) throw new Error('Не удалось обновить заявку')

  const { error: userErr } = await supabase
    .from('users')
    .update({ driver_verification_status: 'approved' })
    .eq('id', applicantId)
  if (userErr) throw new Error('Не удалось обновить статус пользователя')

  await supabase
    .from('driver_documents')
    .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: now })
    .eq('driver_id', applicantId)
}

/** Отклонить заявку с причиной: статус → rejected, причина в заявку. */
export async function rejectDriverApplication(
  requestId: string,
  applicantId: string,
  reason: string,
): Promise<void> {
  if (!isTelegramEnv()) {
    removeMockApplication(requestId)
    return
  }
  const now = new Date().toISOString()
  const reviewerId = await currentAdminId()

  const { error: reqErr } = await supabase
    .from('moderation_requests')
    .update({
      status: 'rejected',
      comment: reason,
      reviewed_by: reviewerId,
      reviewed_at: now,
    })
    .eq('id', requestId)
  if (reqErr) throw new Error('Не удалось обновить заявку')

  const { error: userErr } = await supabase
    .from('users')
    .update({ driver_verification_status: 'rejected' })
    .eq('id', applicantId)
  if (userErr) throw new Error('Не удалось обновить статус пользователя')

  await supabase
    .from('driver_documents')
    .update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: now })
    .eq('driver_id', applicantId)
}

// --- Мок-данные (браузерный режим) ---------------------------------------

const PLACEHOLDER = (text: string) =>
  `https://placehold.co/600x380/E8EFFE/2F6FED?text=${encodeURIComponent(text)}`

let mockApplications: DriverApplicationReview[] | null = null

function seedMockApplications(): DriverApplicationReview[] {
  return [
    {
      requestId: 'mock-req-1',
      createdAt: new Date().toISOString(),
      applicant: {
        id: 'mock-user-1',
        fullName: 'Иванова Анна Сергеевна',
        course: 2,
        age: 19,
        isuNumber: '412345',
        telegramUsername: 'anna_i',
      },
      vehicle: {
        make: 'Lada',
        model: 'Vesta',
        plateNumber: 'А123ВС 178',
        color: 'Белый',
        seatsCount: 4,
      },
      documents: [
        { id: 'd1', type: 'license', side: 'front', url: PLACEHOLDER('ВУ лицевая') },
        { id: 'd2', type: 'license', side: 'back', url: PLACEHOLDER('ВУ задняя') },
        { id: 'd3', type: 'sts', side: 'front', url: PLACEHOLDER('СТС лицевая') },
        { id: 'd4', type: 'sts', side: 'back', url: PLACEHOLDER('СТС задняя') },
      ],
    },
    {
      requestId: 'mock-req-2',
      createdAt: new Date().toISOString(),
      applicant: {
        id: 'mock-user-2',
        fullName: 'Смирнов Дмитрий Олегович',
        course: 4,
        age: 21,
        isuNumber: '398765',
        telegramUsername: 'dmitry_s',
      },
      vehicle: {
        make: 'Kia',
        model: 'Rio',
        plateNumber: 'О777ОО 198',
        color: 'Серый',
        seatsCount: 4,
      },
      documents: [
        { id: 'd5', type: 'license', side: 'front', url: PLACEHOLDER('ВУ лицевая') },
        { id: 'd6', type: 'license', side: 'back', url: PLACEHOLDER('ВУ задняя') },
        { id: 'd7', type: 'sts', side: 'front', url: PLACEHOLDER('СТС лицевая') },
        { id: 'd8', type: 'sts', side: 'back', url: PLACEHOLDER('СТС задняя') },
      ],
    },
  ]
}

function getMockApplications(): DriverApplicationReview[] {
  if (!mockApplications) mockApplications = seedMockApplications()
  return [...mockApplications]
}

function removeMockApplication(requestId: string): void {
  if (!mockApplications) return
  mockApplications = mockApplications.filter((a) => a.requestId !== requestId)
}
