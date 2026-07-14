import { NextRequest, NextResponse } from 'next/server'
import { getMediaById } from '@/db/queries/galleries'
import { signUploadPart } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PART_SIZE = 52428800 // 50 MB — mora se poklapati sa init rutom

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Poziva se jednom po chunku; limit velikodušan (1GB fajl = ~20 chunkova).
    const rl = rateLimit(`upload-sign:${clientIp(req)}`, 1000, 10 * 60 * 1000)
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
    const partNumber = Number(body.partNumber)

    if (!objectKey.startsWith(`galleries/${slug}/`)) {
      return NextResponse.json({ error: 'Neispravan ključ objekta' }, { status: 400 })
    }
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json({ error: 'Neispravan mediaId' }, { status: 400 })
    }
    if (!uploadId) {
      return NextResponse.json({ error: 'Nedostaje uploadId' }, { status: 400 })
    }

    // Vlasništvo + status: potpisuj samo za medij koji stvarno pripada ovom ključu
    // i još je u toku. Spriječava potpisivanje dijelova za tuđe/gotove medije.
    const media = await getMediaById(mediaId)
    if (!media || media.object_key !== objectKey) {
      return NextResponse.json({ error: 'Medij nije pronađen' }, { status: 404 })
    }
    if (media.status !== 'uploading') {
      return NextResponse.json({ error: 'Upload je već završen' }, { status: 409 })
    }

    // Ograniči broj dijelova na osnovu DEKLARISANE veličine (+1 headroom).
    // Bez ovoga bi napadač mogao tražiti proizvoljno mnogo dijelova i puniti bucket.
    const maxParts = Math.ceil(media.size_bytes / PART_SIZE) + 1
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > maxParts) {
      return NextResponse.json({ error: 'Neispravan broj dijela' }, { status: 400 })
    }

    const url = await signUploadPart(objectKey, uploadId, partNumber)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Sign part error:', error)
    return NextResponse.json({ error: 'Greška pri potpisivanju dijela' }, { status: 500 })
  }
}
