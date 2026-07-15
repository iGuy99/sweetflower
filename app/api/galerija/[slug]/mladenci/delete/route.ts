import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, getMediaByIdsForGallery, deleteMediaRows } from '@/db/queries/galleries'
import { getCoupleOrAdminSession } from '@/lib/couple-auth'
import { deleteKeys } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_IDS = 200

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const session = await getCoupleOrAdminSession(req, slug)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(`mladenci-delete:${clientIp(req)}`, 30, 10 * 60 * 1000)
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

    const body = await req.json()
    const ids = Array.isArray(body.ids) ? body.ids : []

    if (
      ids.length === 0 ||
      ids.length > MAX_IDS ||
      !ids.every((id: unknown) => Number.isInteger(id) && (id as number) > 0)
    ) {
      return NextResponse.json({ error: 'Nevažeća lista id-jeva' }, { status: 400 })
    }

    // Vlasništvo se provjerava u SQL-u (gallery_id filter) — jedan batch upit;
    // nepostojeći/tuđi id-jevi jednostavno izostanu iz rezultata.
    const owned = await getMediaByIdsForGallery(gallery.id, ids as number[])

    const keys: string[] = []
    for (const row of owned) {
      keys.push(row.object_key)
      if (row.thumb_key) keys.push(row.thumb_key)
    }

    // Prvo bucket, pa tek onda DB redovi — ako brisanje objekata padne, red
    // ostaje u bazi pa se pokušaj može ponoviti (nema "duhova" u bucketu).
    await deleteKeys(keys)
    await deleteMediaRows(owned.map((row) => row.id))

    return NextResponse.json({ deleted: owned.length })
  } catch (error) {
    console.error('Mladenci delete error:', error)
    return NextResponse.json({ error: 'Greška pri brisanju' }, { status: 500 })
  }
}
