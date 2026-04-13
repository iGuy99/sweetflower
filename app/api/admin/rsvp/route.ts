import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getRsvpByInvitation, getRsvpStats } from '@/db/queries/rsvp'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('invitation-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'invitation-admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invitationId = payload.invitationId as number
  const [rsvps, stats] = await Promise.all([
    getRsvpByInvitation(invitationId),
    getRsvpStats(invitationId),
  ])

  return NextResponse.json({ rsvps, stats })
}
