export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getGalleryBySlug } from '@/db/queries/galleries'
import { resolveTheme, parseThemeColumn } from '@/lib/gallery-themes'
import { verifyToken } from '@/lib/auth'
import { COUPLE_COOKIE } from '@/lib/couple-auth'
import { ADMIN_COOKIE, validateAdminToken } from '@/lib/admin-auth'
import CoupleLogin from './CoupleLogin'
import CoupleGallery from './CoupleGallery'
import '../gallery.css'

// Provjeri couple-token (za ovaj slug) ili admin-token — admin sesija se
// prihvata svugdje gdje i mladenci sesija (ista logika kao getCoupleOrAdminSession,
// ovdje inline jer next/headers cookies() nije NextRequest).
async function hasCoupleAccess(slug: string): Promise<boolean> {
  const cookieStore = await cookies()

  const coupleToken = cookieStore.get(COUPLE_COOKIE)?.value
  if (coupleToken) {
    const payload = await verifyToken(coupleToken)
    if (payload && payload.type === 'couple' && payload.slug === slug) return true
  }

  // Uključuje i DB provjeru da admin nalog još postoji (revokacija).
  if (await validateAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) return true

  return false
}

export default async function MladenciPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const gallery = await getGalleryBySlug(slug)

  if (!gallery) {
    notFound()
  }

  const theme = resolveTheme(parseThemeColumn(gallery.theme))

  if (!(await hasCoupleAccess(slug))) {
    return <CoupleLogin slug={gallery.slug} title={gallery.title} theme={theme} />
  }

  return (
    <CoupleGallery
      slug={gallery.slug}
      title={gallery.title}
      eventDate={gallery.event_date}
      theme={theme}
    />
  )
}
