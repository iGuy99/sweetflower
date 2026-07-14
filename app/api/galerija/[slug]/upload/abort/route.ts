import { NextRequest, NextResponse } from 'next/server'
import { getMediaById, deleteMediaRow } from '@/db/queries/galleries'
import { abortMultipart } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const rl = rateLimit(`upload-abort:${clientIp(req)}`, 120, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Previše zahtjeva' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()
    const mediaId = Number(body.mediaId)
    const objectKey = String(body.objectKey ?? '')
    const uploadId = String(body.uploadId ?? '')

    if (!objectKey.startsWith(`galleries/${slug}/`)) {
      return NextResponse.json({ error: 'Neispravan ključ objekta' }, { status: 400 })
    }
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json({ error: 'Neispravan mediaId' }, { status: 400 })
    }
    if (!uploadId) {
      return NextResponse.json({ error: 'Nedostaje uploadId' }, { status: 400 })
    }

    // Vlasništvo: medij mora postojati, pripadati baš ovom ključu, i biti u toku.
    // Bez ovoga bi napadač enumeracijom mediaId-a mogao brisati tuđe (i gotove) medije.
    const media = await getMediaById(mediaId)
    if (!media || media.object_key !== objectKey) {
      return NextResponse.json({ error: 'Medij nije pronađen' }, { status: 404 })
    }
    if (media.status !== 'uploading') {
      return NextResponse.json({ error: 'Medij se ne može otkazati' }, { status: 409 })
    }

    // Best-effort abort na S3; red brišemo bez obzira (multipart je ionako nedovršen).
    try {
      await abortMultipart(objectKey, uploadId)
    } catch (abortError) {
      console.error('abortMultipart error:', abortError)
    }
    await deleteMediaRow(mediaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload abort error:', error)
    return NextResponse.json({ error: 'Greška pri otkazivanju uploada' }, { status: 500 })
  }
}
