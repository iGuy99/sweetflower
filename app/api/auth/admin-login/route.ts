import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/db/queries/admin'
import { signToken } from '@/lib/auth'
import { ADMIN_COOKIE } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 min

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`admin-login:${clientIp(req)}`, MAX_ATTEMPTS, WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Previše pokušaja. Pokušajte ponovo kasnije.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      )
    }

    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Nedostaju podaci' }, { status: 400 })
    }

    const admin = await verifyAdmin(username, password)
    if (!admin) {
      return NextResponse.json({ error: 'Pogrešni podaci za prijavu' }, { status: 401 })
    }

    const token = await signToken({ adminId: admin.id, username: admin.username, type: 'admin' })

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Greška pri prijavi' }, { status: 500 })
  }
}
