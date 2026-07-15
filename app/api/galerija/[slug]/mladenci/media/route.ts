import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, getReadyMediaPage } from '@/db/queries/galleries'
import { getCoupleOrAdminSession } from '@/lib/couple-auth'
import { toMediaPayload, parseMediaCursor, MEDIA_PAGE_SIZE } from '@/lib/media-payload'
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

    const cursor = parseMediaCursor(req)
    if (!cursor.ok) {
      return NextResponse.json({ error: 'Nevažeći kursor' }, { status: 400 })
    }

    // Mladenci vide SVE spremne medije, bez obzira na is_public.
    // +1 trik: jedna stavka više da znamo ima li sljedeće stranice.
    const rows = await getReadyMediaPage(gallery.id, MEDIA_PAGE_SIZE + 1, cursor.beforeId)
    const hasMore = rows.length > MEDIA_PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, MEDIA_PAGE_SIZE) : rows

    const media = await toMediaPayload(pageRows)
    const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null

    return NextResponse.json({ media, nextCursor })
  } catch (error) {
    console.error('Mladenci media list error:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju galerije' }, { status: 500 })
  }
}
