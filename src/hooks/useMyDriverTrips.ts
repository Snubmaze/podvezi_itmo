import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { getMyDriverTrips } from '@/services/trips'
import type { DriverTripWithDetails } from '@/types/trips'

interface UseMyDriverTripsResult {
  trips: DriverTripWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Поездки текущего пользователя как водителя, с заявками (`pending`) и
 * подтверждёнными участниками (`confirmed`), с realtime-обновлением.
 */
export function useMyDriverTrips(driverId: string): UseMyDriverTripsResult {
  const [trips, setTrips] = useState<DriverTripWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let cancelled = false

    getMyDriverTrips(driverId)
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
  }, [driverId, reloadToken])

  useEffect(() => {
    const channel = supabase
      .channel(`my-driver-trips-${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_requests' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, () => refetch())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [driverId, refetch])

  return { trips, loading, error, refetch }
}
