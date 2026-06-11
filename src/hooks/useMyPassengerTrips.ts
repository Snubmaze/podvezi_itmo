import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { getMyPassengerTrips } from '@/services/trips'
import type { TripRequestWithTrip } from '@/types/trips'

interface UseMyPassengerTripsResult {
  requests: TripRequestWithTrip[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Заявки текущего пользователя на участие в поездках, с развёрнутой
 * поездкой, с realtime-обновлением.
 */
export function useMyPassengerTrips(passengerId: string): UseMyPassengerTripsResult {
  const [requests, setRequests] = useState<TripRequestWithTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let cancelled = false

    getMyPassengerTrips(passengerId)
      .then((data) => {
        if (!cancelled) {
          setRequests(data)
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
  }, [passengerId, reloadToken])

  useEffect(() => {
    const channel = supabase
      .channel(`my-passenger-trips-${passengerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_requests' }, () => refetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, () => refetch())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [passengerId, refetch])

  return { requests, loading, error, refetch }
}
