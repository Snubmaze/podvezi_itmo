import { useState } from 'react'

import type { ActiveRole } from '@/components/RoleSwitcher'
import { DriverRegistrationScreen } from '@/pages/DriverRegistrationScreen'
import { HomeScreen } from '@/pages/HomeScreen'
import { MyTripsScreen } from '@/pages/MyTripsScreen'
import { ProfileScreen } from '@/pages/ProfileScreen'
import { TripCreateScreen } from '@/pages/TripCreateScreen'
import type { User } from '@/types/db'

type View = 'home' | 'profile' | 'trip-create' | 'my-trips' | 'driver-verify'

/** Оболочка авторизованной части: навигация между главным экраном, профилем и поездками. */
export function AuthenticatedApp({ user }: { user: User }) {
  const [view, setView] = useState<View>('home')
  const [activeRole, setActiveRole] = useState<ActiveRole>('passenger')

  if (view === 'profile') {
    return <ProfileScreen user={user} onBack={() => setView('home')} />
  }
  if (view === 'trip-create') {
    return (
      <TripCreateScreen
        user={user}
        onBack={() => setView('home')}
        onCreated={() => setView('my-trips')}
      />
    )
  }
  if (view === 'my-trips') {
    return (
      <MyTripsScreen user={user} activeRole={activeRole} onBack={() => setView('home')} />
    )
  }
  if (view === 'driver-verify') {
    return (
      <DriverRegistrationScreen
        user={user}
        onBack={() => setView('home')}
        onSubmitted={() => setView('home')}
      />
    )
  }
  return (
    <HomeScreen
      user={user}
      activeRole={activeRole}
      onChangeActiveRole={setActiveRole}
      onOpenProfile={() => setView('profile')}
      onCreateTrip={() => setView('trip-create')}
      onMyTrips={() => setView('my-trips')}
      onVerifyDriver={() => setView('driver-verify')}
    />
  )
}
