// Edge Function: telegram-auth
// Проверяет подпись Telegram initData (HMAC-SHA256 по bot-token) для
// безопасности, затем по номеру ИСУ находит/создаёт пользователя в auth.users
// (детерминированный email/пароль по ИСУ), гарантирует строку в public.users
// и возвращает клиенту Supabase-сессию. Аккаунт = ИСУ (см. architecture.md §5.1).
//
// verify_jwt = false (на момент вызова сессии ещё нет).
// Секреты: TELEGRAM_BOT_TOKEN, AUTH_USER_SECRET.
// Авто-инжект Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ISU_PATTERN = /^\d{4,10}$/
const encoder = new TextEncoder()

/** HMAC-SHA256, возвращает сырые байты. */
async function hmac(keyBytes: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', key, encoder.encode(message))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Проверяет подпись initData. Возвращает Telegram-пользователя или null.
 * Алгоритм Telegram: secret = HMAC("WebAppData", botToken);
 *                    hash   = HMAC(secret, dataCheckString).
 */
async function verifyInitData(
  initDataRaw: string,
  botToken: string,
): Promise<{ id: number; username?: string } | null> {
  const params = new URLSearchParams(initDataRaw)
  const hash = params.get('hash')
  if (!hash) return null

  const pairs: string[] = []
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  const secret = await hmac(encoder.encode('WebAppData'), botToken)
  const computed = toHex(await hmac(secret, dataCheckString))
  if (computed !== hash) return null

  // Защита от старых initData (24 часа).
  const authDate = Number(params.get('auth_date') ?? '0')
  if (!authDate || Date.now() / 1000 - authDate > 86_400) return null

  const userRaw = params.get('user')
  if (!userRaw) return null
  try {
    const user = JSON.parse(userRaw) as { id: number; username?: string }
    return user?.id ? user : null
  } catch {
    return null
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const authSecret = Deno.env.get('AUTH_USER_SECRET')

  if (!botToken || !authSecret) {
    return json({ error: 'Server is not configured' }, 500)
  }

  let initDataRaw: string | undefined
  let isu: string | undefined
  try {
    const body = (await req.json()) as { initDataRaw?: string; isu?: string }
    initDataRaw = body.initDataRaw
    isu = body.isu?.trim()
  } catch {
    return json({ error: 'Invalid body' }, 400)
  }
  if (!initDataRaw) return json({ error: 'initDataRaw is required' }, 400)
  if (!isu || !ISU_PATTERN.test(isu)) {
    return json({ error: 'Некорректный номер ИСУ' }, 400)
  }

  // Telegram-подпись — только проверка безопасности (личность определяет ИСУ).
  const tgUser = await verifyInitData(initDataRaw, botToken)
  if (!tgUser) return json({ error: 'Invalid init data' }, 401)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Был ли уже аккаунт с этим ИСУ (для is_new_user).
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('isu_number', isu)
    .maybeSingle()

  // Детерминированные учётные данные auth.users по ИСУ.
  const email = `isu${isu}@itmo.podvezi.local`
  const password = toHex(await hmac(encoder.encode(authSecret), isu))

  // Создаём auth-пользователя (если уже есть — игнорируем ошибку).
  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { isu_number: isu },
  })

  // Логинимся, чтобы получить сессию (access/refresh).
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signErr || !signIn.session) {
    return json({ error: 'Sign-in failed' }, 500)
  }

  // Гарантируем строку в public.users (ключ — isu_number; telegram_id — метаданные).
  const { error: upsertErr } = await admin.from('users').upsert(
    {
      id: signIn.user.id,
      isu_number: isu,
      telegram_id: tgUser.id,
      telegram_username: tgUser.username ?? null,
    },
    { onConflict: 'id' },
  )
  if (upsertErr) return json({ error: 'Profile upsert failed' }, 500)

  return json({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
    is_new_user: !existing,
  })
})
