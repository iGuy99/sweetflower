import { NextRequest, NextResponse } from 'next/server'
import { verifyInvitationAdmin } from '@/db/queries/auth'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { slug, username, password } = await req.json()

    if (!slug || !username || !password) {
      return NextResponse.json({ error: 'Nedostaju podaci' }, { status: 400 })
    }

    const result = await verifyInvitationAdmin(slug, username, password)
    if (!result) {
      return NextResponse.json({ error: 'Pogrešni podaci za prijavu' }, { status: 401 })
    }

    const token = await signToken({
      invitationId: result.id,
      slug,
      type: 'invitation-admin',
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('invitation-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Greška pri prijavi' }, { status: 500 })
  }
}
