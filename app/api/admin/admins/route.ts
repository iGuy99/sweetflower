import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, isSuperSession } from '@/lib/admin-auth'
import { listAdmins, createAdmin } from '@/db/queries/admin'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const USERNAME_RE = /^[a-z0-9_.-]{3,50}$/

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperSession(session)) {
    return NextResponse.json({ error: 'Samo superadmin može upravljati adminima' }, { status: 403 })
  }

  const admins = await listAdmins()
  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperSession(session)) {
    return NextResponse.json({ error: 'Samo superadmin može upravljati adminima' }, { status: 403 })
  }

  const limit = rateLimit(`admin-manage:${clientIp(req)}`, 20, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Previše zahtjeva. Pokušajte kasnije.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  try {
    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Korisničko ime: 3-50 znakova, mala slova/brojevi/_.-' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Lozinka mora imati bar 8 znakova' }, { status: 400 })
    }

    const id = await createAdmin(username, password)
    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error: unknown) {
    // Duplikat username-a — mysql2 baca ER_DUP_ENTRY (errno 1062).
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    ) {
      return NextResponse.json({ error: 'Korisničko ime je zauzeto' }, { status: 409 })
    }
    console.error('Create admin error:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju admina' }, { status: 500 })
  }
}
