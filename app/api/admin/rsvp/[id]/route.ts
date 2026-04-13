import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { execute, queryOne } from '@/db/connection'

async function getAuthenticatedInvitationId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get('invitation-token')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'invitation-admin') return null
  return payload.invitationId as number
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const invitationId = await getAuthenticatedInvitationId(req)
  if (!invitationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Provjeri da RSVP pripada ovoj pozivnici
  const rsvp = await queryOne<{ invitation_id: number }>(
    'SELECT invitation_id FROM rsvp_responses WHERE id = ?', [id]
  )
  if (!rsvp || rsvp.invitation_id !== invitationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await execute('DELETE FROM rsvp_responses WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const invitationId = await getAuthenticatedInvitationId(req)
  if (!invitationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { guest_count } = await req.json()

  if (!guest_count || guest_count < 1) {
    return NextResponse.json({ error: 'Neispravan broj gostiju' }, { status: 400 })
  }

  const rsvp = await queryOne<{ invitation_id: number }>(
    'SELECT invitation_id FROM rsvp_responses WHERE id = ?', [id]
  )
  if (!rsvp || rsvp.invitation_id !== invitationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await execute('UPDATE rsvp_responses SET guest_count = ? WHERE id = ?', [guest_count, id])
  return NextResponse.json({ success: true })
}
