import { useState } from 'react'

import { HomeScreen } from '@/pages/HomeScreen'
import { ProfileScreen } from '@/pages/ProfileScreen'
import type { User } from '@/types/db'

type View = 'home' | 'profile'

/** Оболочка авторизованной части: навигация главный экран ↔ профиль. */
export function AuthenticatedApp({ user }: { user: User }) {
  const [view, setView] = useState<View>('home')

  if (view === 'profile') {
    return <ProfileScreen user={user} onBack={() => setView('home')} />
  }
  return <HomeScreen user={user} onOpenProfile={() => setView('profile')} />
}
