import type { NextRequest } from 'next/server'
import { verifyToken } from './auth'
import { getAdminSession } from './admin-auth'

export const COUPLE_COOKIE = 'couple-token'

// Sesija mladenaca vrijedi SAMO za slug za koji je izdana.
// Admin sesija se također prihvata (admin može sve što i mladenci).
export async function getCoupleOrAdminSession(
  req: NextRequest,
  slug: string
): Promise<'couple' | 'admin' | null> {
  const coupleToken = req.cookies.get(COUPLE_COOKIE)?.value
  if (coupleToken) {
    const payload = await verifyToken(coupleToken)
    if (payload && payload.type === 'couple' && payload.slug === slug) {
      return 'couple'
    }
  }

  // Admin grana ide kroz getAdminSession — uključuje i DB provjeru da nalog
  // još postoji (obrisani admin nema pristup ni mladenci rutama).
  if (await getAdminSession(req)) {
    return 'admin'
  }

  return null
}
