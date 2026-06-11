/**
 * Мок-сервис ITMO ID (заглушка вместо реального ITMO ID/SSO).
 *
 * Контракт намеренно изолирован: на шаге «Перспективы развития» (ТЗ п.16)
 * реальная интеграция заменит ТОЛЬКО реализацию `fetchItmoIdProfile`,
 * не затрагивая UI/остальную бизнес-логику.
 *
 * Поведение заглушки (см. ai_context/architecture.md 5.1):
 * - любые непустые логин+пароль = успех (без внешнего запроса);
 * - профиль детерминирован по логину (одинаковый логин → одинаковые данные).
 */

export interface ItmoIdProfile {
  full_name: string
  course: number
  age: number
  avatar_url: string
}

export class ItmoIdEmptyCredentialsError extends Error {
  constructor() {
    super('Логин и пароль обязательны')
    this.name = 'ItmoIdEmptyCredentialsError'
  }
}

/** Предопределённый набор мок-профилей (выбор по хэшу логина). */
const MOCK_PROFILES: ReadonlyArray<Omit<ItmoIdProfile, 'avatar_url'>> = [
  { full_name: 'Полярус Павел Анатольевич', course: 3, age: 20 },
  { full_name: 'Иванова Анна Сергеевна', course: 2, age: 19 },
  { full_name: 'Смирнов Дмитрий Олегович', course: 4, age: 21 },
  { full_name: 'Кузнецова Мария Павловна', course: 1, age: 18 },
  { full_name: 'Фёдоров Алексей Николаевич', course: 5, age: 22 },
]

/** Детерминированный строковый хэш (djb2). */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

/** Детерминированный URL аватара по логину. */
function avatarUrlForLogin(login: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(login)}`
}

/**
 * Имитирует вход через ITMO ID и возвращает мок-профиль.
 * Бросает `ItmoIdEmptyCredentialsError`, если логин/пароль пустые.
 */
export async function fetchItmoIdProfile(
  login: string,
  password: string,
): Promise<ItmoIdProfile> {
  const trimmedLogin = login.trim()
  if (trimmedLogin === '' || password.trim() === '') {
    throw new ItmoIdEmptyCredentialsError()
  }

  // Имитация сетевой задержки для правдоподобности UI.
  await new Promise((resolve) => setTimeout(resolve, 600))

  const profile = MOCK_PROFILES[hashString(trimmedLogin) % MOCK_PROFILES.length]
  return {
    ...profile,
    avatar_url: avatarUrlForLogin(trimmedLogin),
  }
}
