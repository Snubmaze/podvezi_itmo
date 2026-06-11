import { useEffect, useState } from 'react'

import { fetchLocations } from '@/services/locations'
import type { Location } from '@/types/db'

interface UseLocationsResult {
  locations: Location[]
  loading: boolean
  error: string | null
}

/** Справочник точек маршрутов (корпуса и общежития ИТМО, ТЗ 5.5). */
export function useLocations(): UseLocationsResult {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchLocations()
      .then((data) => {
        if (!cancelled) setLocations(data)
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
  }, [])

  return { locations, loading, error }
}
