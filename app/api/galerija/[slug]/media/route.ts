import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, getReadyMediaPage } from '@/db/queries/galleries'
import { toMediaPayload, parseMediaCursor, MEDIA_PAGE_SIZE } from '@/lib/media-payload'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const rl = rateLimit(`media-list:${clientIp(req)}`, 120, 60 * 1000)
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
    if (!gallery.is_public) {
      return NextResponse.json(
        { error: 'Ova galerija nije javna' },
        { status: 403 }
      )
    }

    const cursor = parseMediaCursor(req)
    if (!cursor.ok) {
      return NextResponse.json({ error: 'Nevažeći kursor' }, { status: 400 })
    }

    // +1 trik: dohvati jednu stavku više da znamo ima li sljedeće stranice.
    const rows = await getReadyMediaPage(gallery.id, MEDIA_PAGE_SIZE + 1, cursor.beforeId)
    const hasMore = rows.length > MEDIA_PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, MEDIA_PAGE_SIZE) : rows

    const media = await toMediaPayload(pageRows)
    const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null

    return NextResponse.json({ media, nextCursor })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju galerije' }, { status: 500 })
  }
}
