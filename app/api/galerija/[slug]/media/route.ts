import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, getReadyMedia } from '@/db/queries/galleries'
import { signDownload } from '@/lib/s3'
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

    const rows = await getReadyMedia(gallery.id)

    const media = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        mediaType: row.media_type,
        thumbUrl: row.thumb_key ? await signDownload(row.thumb_key) : null,
        url: await signDownload(row.object_key),
        uploaderName: row.uploader_name,
        fileName: row.file_name,
        createdAt: row.created_at,
      }))
    )

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju galerije' }, { status: 500 })
  }
}
