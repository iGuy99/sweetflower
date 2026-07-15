export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { ADMIN_COOKIE } from '@/lib/admin-auth'
import { getAllGalleries } from '@/db/queries/galleries'
import AdminLogin from './AdminLogin'
import GalleriesDashboard from './GalleriesDashboard'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value

  if (token) {
    const payload = await verifyToken(token)
    if (payload && payload.type === 'admin') {
      const galleries = await getAllGalleries()
      return <GalleriesDashboard initialGalleries={galleries} isSuper={payload.role === 'super'} />
    }
  }

  return <AdminLogin />
}
