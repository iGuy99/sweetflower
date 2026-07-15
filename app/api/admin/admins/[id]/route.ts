import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, isSuperSession } from '@/lib/admin-auth'
import { getAdminById, deleteAdmin, updateAdminPassword } from '@/db/queries/admin'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const adminId = Number(id)
  if (!Number.isInteger(adminId)) {
    return NextResponse.json({ error: 'Neispravan ID' }, { status: 400 })
  }

  const target = await getAdminById(adminId)
  if (!target) return NextResponse.json({ error: 'Admin ne postoji' }, { status: 404 })

  // Super je zauvijek jedan — ni sebe ni drugog superadmina nije moguće obrisati.
  if (target.role === 'super') {
    return NextResponse.json({ error: 'Superadmin nalog se ne može obrisati' }, { status: 400 })
  }

  await deleteAdmin(adminId)
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const adminId = Number(id)
  if (!Number.isInteger(adminId)) {
    return NextResponse.json({ error: 'Neispravan ID' }, { status: 400 })
  }

  const target = await getAdminById(adminId)
  if (!target) return NextResponse.json({ error: 'Admin ne postoji' }, { status: 404 })

  try {
    const body = await req.json()
    const password = String(body.password ?? '')
    if (password.length < 8) {
      return NextResponse.json({ error: 'Lozinka mora imati bar 8 znakova' }, { status: 400 })
    }

    // Radi i na vlastitom nalogu — superadmin može resetovati svoju lozinku.
    await updateAdminPassword(adminId, password)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update admin password error:', error)
    return NextResponse.json({ error: 'Greška pri promjeni lozinke' }, { status: 500 })
  }
}
