export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { ADMIN_COOKIE, validateAdminToken } from '@/lib/admin-auth'
import { getAllGalleries } from '@/db/queries/galleries'
import AdminLogin from './AdminLogin'
import GalleriesDashboard from './GalleriesDashboard'

export default async function AdminPage() {
  const cookieStore = await cookies()
  // validateAdminToken uključuje i DB provjeru da nalog još postoji.
  const payload = await validateAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)

  if (payload) {
    const galleries = await getAllGalleries()
    return <GalleriesDashboard initialGalleries={galleries} isSuper={payload.role === 'super'} />
  }

  return <AdminLogin />
}
