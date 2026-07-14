import { NextRequest, NextResponse } from 'next/server'
import { getGalleryBySlug, createMediaRow, deleteMediaRow } from '@/db/queries/galleries'
import { objectKey, thumbKey, startMultipart, signSimpleUpload, type MediaType } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// --- Konstante ---
const MAX_SIZE_BYTES = 1073741824 // 1 GB
const PART_SIZE = 52428800 // 50 MB
const RATE_MAX = 60 // 60 init poziva
const RATE_WINDOW_MS = 10 * 60 * 1000 // po 10 minuta

// Dozvoljeni MIME tipovi -> fallback ekstenzija (kad je fileName bez upotrebljive .ext).
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

// Izvedi ekstenziju iz imena fajla: zadnja .ekstenzija, lowercase, samo [a-z0-9], max 10.
function extFromFileName(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.')
  if (dot === -1 || dot === fileName.length - 1) return null
  const raw = fileName
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!raw) return null
  return raw.slice(0, 10)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Rate limit po IP-u.
    const ip = clientIp(req)
    const rl = rateLimit(`upload-init:${ip}`, RATE_MAX, RATE_WINDOW_MS)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Previše zahtjeva. Pokušaj ponovo za koji trenutak.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const gallery = await getGalleryBySlug(slug)
    if (!gallery) {
      return NextResponse.json({ error: 'Galerija nije pronađena' }, { status: 404 })
    }

    const body = await req.json()
    const fileName = String(body.fileName ?? '').trim()
    const mimeType = String(body.mimeType ?? '').trim().toLowerCase()
    const sizeBytes = Number(body.sizeBytes)
    const uploaderNameRaw =
      typeof body.uploaderName === 'string' ? body.uploaderName.trim() : ''

    if (!fileName || fileName.length > 255) {
      return NextResponse.json({ error: 'Ime fajla je obavezno (max 255 znakova)' }, { status: 400 })
    }
    // Ograniči ime gosta (spriječi zloupotrebu DB/response prostora).
    const uploaderName = uploaderNameRaw.slice(0, 100)

    // Validacija MIME tipa protiv allow-liste.
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_MIME, mimeType)) {
      return NextResponse.json(
        { error: 'Nedozvoljen tip fajla. Dozvoljene su slike i video zapisi.' },
        { status: 400 }
      )
    }
    const mediaType: MediaType = mimeType.startsWith('image/') ? 'image' : 'video'

    // Validacija veličine.
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Neispravna veličina fajla (dozvoljeno do 1 GB)' },
        { status: 400 }
      )
    }

    // Ekstenzija: iz imena fajla ili fallback iz MIME tipa.
    const ext = extFromFileName(fileName) ?? ALLOWED_MIME[mimeType]

    const uuid = crypto.randomUUID()

    let key: string
    let tkey: string
    try {
      key = objectKey(slug, uuid, ext)
      tkey = thumbKey(slug, uuid)
    } catch {
      return NextResponse.json({ error: 'Neispravna ekstenzija fajla' }, { status: 400 })
    }

    const mediaId = await createMediaRow({
      galleryId: gallery.id,
      objectKey: key,
      thumbKey: tkey,
      fileName,
      mimeType,
      sizeBytes,
      mediaType,
      uploaderName: uploaderName || null,
    })

    let uploadId: string
    try {
      uploadId = await startMultipart(key, mimeType)
    } catch (error) {
      console.error('startMultipart error:', error)
      // Očisti media red da ne ostane sirotan 'uploading' zapis.
      try {
        await deleteMediaRow(mediaId)
      } catch (cleanupError) {
        console.error('deleteMediaRow cleanup error:', cleanupError)
      }
      return NextResponse.json({ error: 'Greška pri pokretanju uploada' }, { status: 500 })
    }

    const thumbUploadUrl = await signSimpleUpload(tkey, 'image/jpeg')

    return NextResponse.json({
      mediaId,
      objectKey: key,
      uploadId,
      thumbUploadUrl,
      partSize: PART_SIZE,
    })
  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json({ error: 'Greška pri pokretanju uploada' }, { status: 500 })
  }
}
