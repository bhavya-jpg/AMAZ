import { isAdminRequest } from './auth'

export function requireAdmin(req: Request): Response | null {
  return isAdminRequest(req) ? null : Response.json({ error: 'admin login required' }, { status: 401 })
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}
