import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getRsvpByInvitation, getRsvpStats } from '@/db/queries/rsvp'
import AdminLogin from './AdminLogin'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('invitation-token')?.value

  if (token) {
    const payload = await verifyToken(token)
    if (payload && payload.slug === slug && payload.type === 'invitation-admin') {
      const invitationId = payload.invitationId as number
      const [rsvps, stats] = await Promise.all([
        getRsvpByInvitation(invitationId),
        getRsvpStats(invitationId),
      ])
      return <AdminDashboard slug={slug} rsvps={rsvps} stats={stats} />
    }
  }

  return <AdminLogin slug={slug} />
}
