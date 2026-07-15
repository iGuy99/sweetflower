import { NextRequest, NextResponse } from 'next/server'
import { verifyCouplePassword } from '@/db/queries/galleries'
import { signToken } from '@/lib/auth'
import { COUPLE_COOKIE } from '@/lib/couple-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 min

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`couple-login:${clientIp(req)}`, MAX_ATTEMPTS, WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Previše pokušaja. Pokušajte ponovo kasnije.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      )
    }

    const { slug, password } = await req.json()

    if (!slug || !password) {
      return NextResponse.json({ error: 'Nedostaju podaci' }, { status: 400 })
    }

    const ok = await verifyCouplePassword(String(slug), String(password))
    if (!ok) {
      // Ista poruka za pogrešnu šifru i nepostojeću galeriju — anti-enumeracija.
      return NextResponse.json({ error: 'Pogrešna šifra' }, { status: 401 })
    }

    const token = await signToken({ type: 'couple', slug: String(slug) }, '30d')

    const response = NextResponse.json({ success: true })
    response.cookies.set(COUPLE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Couple login error:', error)
    return NextResponse.json({ error: 'Greška pri prijavi' }, { status: 500 })
  }
}
