// Live timeline updates for the console (no surface token needed; replay mode is public).
import { randomUUID } from 'node:crypto'
import { isAdminRequest } from '@/lib/auth'
import { sseResponse } from '@/lib/hub'
import { currentMode } from '@/lib/mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!isAdminRequest(req) && currentMode() !== 'replay') return Response.json({ error: 'admin login required' }, { status: 401 })
  return sseResponse(`console:${randomUUID()}`, req.signal)
}
