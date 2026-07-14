import { NextRequest, NextResponse } from 'next/server'
import { getMediaById, markMediaReady, deleteMediaRow } from '@/db/queries/galleries'
import { completeMultipart, headObjectSize, deleteKeys, type CompletedPart } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 1073741824 // 1 GB — mora se poklapati sa init rutom

// Validiraj i normalizuj listu dijelova iz tijela zahtjeva.
function parseParts(input: unknown): CompletedPart[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const parts: CompletedPart[] = []
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) return null
    const partNumber = Number((raw as { PartNumber?: unknown }).PartNumber)
    const etag = (raw as { ETag?: unknown }).ETag
    if (!Number.isInteger(partNumber) || partNumber < 1) return null
    if (typeof etag !== 'string' || etag.length === 0) return null
    parts.push({ PartNumber: partNumber, ETag: etag })
  }
  return parts
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const rl = rateLimit(`upload-complete:${clientIp(req)}`, 120, 10 * 60 * 1000)
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

    // Sigurnost: ključ mora pripadati baš ovoj galeriji.
    if (!objectKey.startsWith(`galleries/${slug}/`)) {
      return NextResponse.json({ error: 'Neispravan ključ objekta' }, { status: 400 })
    }
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json({ error: 'Neispravan mediaId' }, { status: 400 })
    }
    if (!uploadId) {
      return NextResponse.json({ error: 'Nedostaje uploadId' }, { status: 400 })
    }

    const parts = parseParts(body.parts)
    if (!parts) {
      return NextResponse.json({ error: 'Nedostaju dijelovi uploada' }, { status: 400 })
    }

    const media = await getMediaById(mediaId)
    if (!media) {
      return NextResponse.json({ error: 'Medij nije pronađen' }, { status: 404 })
    }
    if (media.object_key !== objectKey) {
      return NextResponse.json(
        { error: 'Ključ objekta ne odgovara mediju' },
        { status: 400 }
      )
    }

    // Idempotentno: ako je već završen (npr. klijent retry-a nakon izgubljenog
    // odgovora), vrati uspjeh umjesto da completeMultipart padne na S3.
    if (media.status === 'ready') {
      return NextResponse.json({ success: true })
    }

    await completeMultipart(objectKey, uploadId, parts)

    // Airtight cap: presigned PUT ne ograničava veličinu dijela, pa provjeri
    // STVARNU veličinu sklopljenog objekta. Ako pređe limit, obriši i odbij.
    const actualSize = await headObjectSize(objectKey)
    if (actualSize > MAX_SIZE_BYTES) {
      await deleteKeys([objectKey, media.thumb_key].filter((k): k is string => !!k))
      await deleteMediaRow(mediaId)
      return NextResponse.json(
        { error: 'Fajl prelazi dozvoljenu veličinu (1 GB)' },
        { status: 400 }
      )
    }

    await markMediaReady(mediaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload complete error:', error)
    return NextResponse.json({ error: 'Greška pri završavanju uploada' }, { status: 500 })
  }
}
