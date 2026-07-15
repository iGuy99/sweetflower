import type { NextRequest } from 'next/server'
import { verifyToken } from './auth'
import { getAdminById } from '@/db/queries/admin'

export const ADMIN_COOKIE = 'admin-token'

// Zajednička validacija admin tokena: potpis + tip + nalog JOŠ POSTOJI u bazi.
// Bez DB provjere bi obrisani admin zadržao pristup do isteka tokena (7 dana).
// Tokeni bez adminId claima (izdani prije role sistema) se odbijaju — vlasnik
// se mora ponovo prijaviti (ionako mu treba novi token zbog role claima).
export async function validateAdminToken(token: string | undefined) {
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'admin') return null

  const adminId = Number(payload.adminId)
  if (!Number.isInteger(adminId)) return null
  if (!(await getAdminById(adminId))) return null

  return payload
}

// Provjeri admin-token iz requesta. Vraća payload ili null.
export async function getAdminSession(req: NextRequest) {
  return validateAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)
}

// Superadmin (role='super') smije upravljati admin nalozima. Stari tokeni
// (izdati prije uvođenja role) nemaju `role` — tretiraju se kao obični admin.
// Napomena: parametar je Record<string, unknown> (ne { role?: unknown } iz
// plana) — JWTPayload iz jose ima samo index signature pa TS weak-type
// detekcija odbija literalni oblik iz plana (TS2559).
export function isSuperSession(payload: Record<string, unknown> | null): boolean {
  return payload?.role === 'super'
}
