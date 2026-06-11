import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { searchTrips } from '@/services/trips'
import type { TripSearchFilters, TripWithRoute } from '@/types/trips'

interface UseTripSearchResult {
  trips: TripWithRoute[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Поиск активных поездок по фильтрам (ТЗ 5.7) с realtime-обновлением. */
export function useTripSearch(
  filters: TripSearchFilters,
  excludeDriverId?: string,
): UseTripSearchResult {
  const [trips, setTrips] = useState<TripWithRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  const { originId, destinationId, date, timeFrom } = filters

  useEffect(() => {
    let cancelled = false

    searchTrips({ originId, destinationId, date, timeFrom }, excludeDriverId)
      .then((data) => {
        if (!cancelled) {
          setTrips(data)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [originId, destinationId, date, timeFrom, excludeDriverId, reloadToken])

  useEffect(() => {
    const channel = supabase
      .channel('trips-search')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => refetch())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { trips, loading, error, refetch }
}
