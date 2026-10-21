import { ADMIN_COOKIE, adminConfigured, checkAdminPassword, makeAdminSession } from '@/lib/auth'
import { readJson } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const g = globalThis as unknown as { __dsLoginFails?: { count: number; since: number } }

export async function POST(req: Request) {
  if (!adminConfigured()) return Response.json({ error: 'ADMIN_PASSWORD is not set on the server' }, { status: 503 })
  const f = (g.__dsLoginFails ??= { count: 0, since: Date.now() })
  if (Date.now() - f.since > 60_000) Object.assign(f, { count: 0, since: Date.now() })
  if (f.count >= 10) return Response.json({ error: 'too many attempts — wait a minute' }, { status: 429 })

  const body = await readJson<{ password?: string }>(req)
  if (!checkAdminPassword(String(body?.password ?? ''))) {
    f.count++
    return Response.json({ error: 'wrong password' }, { status: 401 })
  }
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_COOKIE}=${encodeURIComponent(makeAdminSession())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`,
    },
  })
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` },
  })
}
