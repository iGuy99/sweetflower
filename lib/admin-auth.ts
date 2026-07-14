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
