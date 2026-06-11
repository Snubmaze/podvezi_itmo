import { useCallback, useEffect, useState } from 'react'

import { getPendingDriverApplications } from '@/services/moderation'
import type { DriverApplicationReview } from '@/types/moderation'

interface UsePendingApplicationsResult {
  applications: DriverApplicationReview[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Заявки водителей «На проверке» для админ-панели (шаг 8). */
export function usePendingApplications(): UsePendingApplicationsResult {
  const [applications, setApplications] = useState<DriverApplicationReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getPendingDriverApplications()
      .then((data) => {
        if (!cancelled) {
          setApplications(data)
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
  }, [reloadKey])

  const refetch = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  return { applications, loading, error, refetch }
}
