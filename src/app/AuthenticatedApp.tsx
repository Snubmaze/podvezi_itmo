import { useState } from 'react'

import type { ActiveRole } from '@/components/RoleSwitcher'
import { AdminModerationScreen } from '@/pages/AdminModerationScreen'
import { CoTravelerProfileScreen } from '@/pages/CoTravelerProfileScreen'
import { DriverRegistrationScreen } from '@/pages/DriverRegistrationScreen'
import { HomeScreen } from '@/pages/HomeScreen'
import { MyTripsScreen } from '@/pages/MyTripsScreen'
import { ProfileScreen } from '@/pages/ProfileScreen'
import { TripCreateScreen } from '@/pages/TripCreateScreen'
import type { User } from '@/types/db'

type View =
  | 'home'
  | 'profile'
  | 'trip-create'
  | 'my-trips'
  | 'driver-verify'
  | 'admin'
  | 'driver-profile'

/** Оболочка авторизованной части: навигация между главным экраном, профилем и поездками. */
export function AuthenticatedApp({ user }: { user: User }) {
  const [view, setView] = useState<View>('home')
  const [activeRole, setActiveRole] = useState<ActiveRole>('passenger')
  /** Водитель, чей профиль открыт, и экран для возврата по «Назад». */
  const [driverProfile, setDriverProfile] = useState<{
    userId: string
    from: View
  } | null>(null)

  const openDriverProfile = (from: View) => (userId: string) => {
    setDriverProfile({ userId, from })
    setView('driver-profile')
  }

  if (view === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onBack={() => setView('home')}
        onOpenAdmin={() => setView('admin')}
      />
    )
  }
  if (view === 'admin') {
    return <AdminModerationScreen onBack={() => setView('profile')} />
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
      <MyTripsScreen
        user={user}
        activeRole={activeRole}
        onBack={() => setView('home')}
        onOpenDriverProfile={openDriverProfile('my-trips')}
      />
    )
  }
  if (view === 'driver-profile' && driverProfile) {
    return (
      <CoTravelerProfileScreen
        userId={driverProfile.userId}
        onBack={() => setView(driverProfile.from)}
      />
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
      onOpenDriverProfile={openDriverProfile('home')}
    />
  )
}
