import type { NextRequest } from 'next/server'
import { verifyToken } from './auth'

export const ADMIN_COOKIE = 'admin-token'

// Provjeri admin-token iz requesta. Vraća payload ili null.
export async function getAdminSession(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'admin') return null

  return payload
}

// Superadmin (role='super') smije upravljati admin nalozima. Stari tokeni
// (izdati prije uvođenja role) nemaju `role` — tretiraju se kao obični admin.
// Napomena: parametar je Record<string, unknown> (ne { role?: unknown } iz
// plana) — JWTPayload iz jose ima samo index signature pa TS weak-type
// detekcija odbija literalni oblik iz plana (TS2559).
export function isSuperSession(payload: Record<string, unknown> | null): boolean {
  return payload?.role === 'super'
}
