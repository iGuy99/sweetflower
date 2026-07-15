export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { ADMIN_COOKIE, validateAdminToken } from '@/lib/admin-auth'
import { getGalleryById } from '@/db/queries/galleries'
import { parseThemeColumn } from '@/lib/gallery-themes'
import ThemeEditor from './ThemeEditor'

export default async function GalleryThemeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value

  const payload = await validateAdminToken(token)
  if (!payload) redirect('/admin')

  const { id } = await params
  const galleryId = Number(id)
  if (!Number.isInteger(galleryId)) notFound()

  const gallery = await getGalleryById(galleryId)
  if (!gallery) notFound()

  return (
    <ThemeEditor
      galleryId={gallery.id}
      slug={gallery.slug}
      title={gallery.title}
      initialTheme={parseThemeColumn(gallery.theme)}
    />
  )
}
