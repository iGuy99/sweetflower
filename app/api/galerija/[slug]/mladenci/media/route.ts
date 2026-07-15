import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, getReadyMedia } from '@/db/queries/galleries'
import { getCoupleOrAdminSession } from '@/lib/couple-auth'
import { toMediaPayload } from '@/lib/media-payload'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const session = await getCoupleOrAdminSession(req, slug)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(`mladenci-media:${clientIp(req)}`, 120, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Previše zahtjeva' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const gallery = await getGalleryBySlug(slug)
    if (!gallery) {
      return NextResponse.json({ error: 'Galerija nije pronađena' }, { status: 404 })
    }

    // Mladenci vide SVE spremne medije, bez obzira na is_public.
    const rows = await getReadyMedia(gallery.id)
    const media = await toMediaPayload(rows)

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Mladenci media list error:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju galerije' }, { status: 500 })
  }
}
