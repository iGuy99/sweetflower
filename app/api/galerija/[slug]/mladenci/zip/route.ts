import { NextRequest, NextResponse } from 'next/server'
import { ZipArchive } from 'archiver'
import { Readable } from 'node:stream'
import { getGalleryBySlug, getReadyMedia } from '@/db/queries/galleries'
import { getCoupleOrAdminSession } from '@/lib/couple-auth'
import { getObjectStream } from '@/lib/s3'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_IDS = 500

// Isto pravilo kao signDownload u lib/s3.ts — sanitizuj ime fajla za ZIP unos.
function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]/g, '_').slice(0, 100)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const session = await getCoupleOrAdminSession(req, slug)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Skupa operacija (streamuje cijelu galeriju) — strožiji rate limit.
  const rl = rateLimit(`couple-zip:${clientIp(req)}`, 5, 10 * 60 * 1000)
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

  const rows = await getReadyMedia(gallery.id)

  // ?ids=1,2,3 opcionalno — inače svi spremni mediji. Ownership: filtriraj
  // kroz getReadyMedia rezultat (ne pojedinačne getMediaById upite).
  const idsParam = req.nextUrl.searchParams.get('ids')
  let selected = rows
  if (idsParam) {
    const ids = idsParam
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, MAX_IDS)
    const idSet = new Set(ids)
    selected = rows.filter((row) => idSet.has(row.id))
  }

  if (selected.length === 0) {
    return NextResponse.json({ error: 'Nema fajlova za preuzimanje' }, { status: 400 })
  }

  // level 0 (store): slike/video su već komprimovani — štedi CPU i vrijeme.
  const archive = new ZipArchive({ zlib: { level: 0 } })

  // Streamuj fajlove LAZY, jedan po jedan — dohvati S3 stream tek kad je taj
  // fajl na redu (awaita 'entry' event), da ne otvaramo stotine S3 konekcija
  // unaprijed (idle timeout rizik). Radi u pozadini dok se response već
  // vraća — archiver emituje podatke u toku, ne čekamo cijeli ZIP.
  void (async () => {
    try {
      let n = 0
      for (const row of selected) {
        n += 1
        const prefix = String(n).padStart(3, '0')
        const name = `${prefix}-${sanitizeFileName(row.file_name)}`
        const stream = await getObjectStream(row.object_key)
        archive.append(stream, { name })
        await new Promise<void>((resolve, reject) => {
          archive.once('entry', () => resolve())
          archive.once('error', reject)
        })
      }
      await archive.finalize()
    } catch (error) {
      // Greška usred streama se ne može pretvoriti u status kod — response
      // headeri su već poslani. Samo logujemo i prekidamo archive.
      console.error('ZIP streaming error:', error)
      archive.abort()
    }
  })()

  const webStream = Readable.toWeb(archive) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}-galerija.zip"`,
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
