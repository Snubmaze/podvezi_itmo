/**
 * Доменный сервис справочника точек маршрутов (`locations`): корпуса и
 * общежития ИТМО (ТЗ 5.5).
 */

import { supabase } from '@/lib/supabase'
import type { Location } from '@/types/db'

/** Активные точки маршрутов, отсортированные по типу и названию. */
export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('kind', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error('Не удалось загрузить список точек маршрута')
  return data as Location[]
}

export interface RoutePairValidation {
  valid: boolean
  error?: string
}

/**
 * Валидация пары «отправление — назначение» (ТЗ 5.5.2).
 *
 * Решение пользователя (шаг 5): отдельная сущность `routes` — справочник
 * популярных комбинаций для будущих подсказок/фильтров UI, а не жёсткое
 * ограничение. Любая пара различных активных точек из `locations` допустима
 * (соответствует БД-ограничению `trips.origin_id <> trips.destination_id`).
 */
export function validateRoutePair(
  originId: string | null,
  destinationId: string | null,
): RoutePairValidation {
  if (!originId || !destinationId) {
    return { valid: false, error: 'Выберите точку отправления и точку назначения' }
  }
  if (originId === destinationId) {
    return { valid: false, error: 'Точки отправления и назначения должны различаться' }
  }
  return { valid: true }
}
