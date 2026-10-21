// Polled by the pairing surface. Returns the surface token exactly once after approval.
import { claimPairingToken, getPairing } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const p = getPairing(id)
  if (!p) return Response.json({ status: 'unknown' }, { status: 404 })
  if (!p.approved_surface_id) {
    return Response.json({ status: p.expires_at < Date.now() ? 'expired' : 'pending' })
  }
  const token = claimPairingToken(id)
  if (!token) return Response.json({ status: 'already_claimed' }, { status: 410 })
  return Response.json({ status: 'approved', surface_id: p.approved_surface_id, surface_token: token, name: p.name })
}
