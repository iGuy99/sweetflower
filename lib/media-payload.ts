import type { NextRequest } from 'next/server'
import type { GalleryMedia } from '@/db/queries/galleries'
import { signDownload } from '@/lib/s3'

// Veličina stranice grida (guest i mladenci) — klijent dovlači sljedeću
// stranicu na scroll-near-bottom (infinite scroll).
export const MEDIA_PAGE_SIZE = 60

// Parsira ?cursor= (id zadnje učitane stavke) iz querija.
export function parseMediaCursor(
  req: NextRequest
): { ok: true; beforeId?: number } | { ok: false } {
  const raw = req.nextUrl.searchParams.get('cursor')
  if (raw === null) return { ok: true }
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return { ok: false }
  return { ok: true, beforeId: n }
}

// Zajednički oblik media stavke za klijenta (guest i mladenci endpoint-i) —
// izdvojeno da nema copy-paste drifta između dva mjesta koja mapiraju iste redove.
export interface MediaPayloadItem {
  id: number
  mediaType: 'image' | 'video'
  thumbUrl: string | null
  url: string
  downloadUrl: string
  uploaderName: string | null
  fileName: string
  createdAt: string
}

export async function toMediaPayload(rows: GalleryMedia[]): Promise<MediaPayloadItem[]> {
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      mediaType: row.media_type,
      thumbUrl: row.thumb_key ? await signDownload(row.thumb_key) : null,
      url: await signDownload(row.object_key),
      downloadUrl: await signDownload(row.object_key, row.file_name),
      uploaderName: row.uploader_name,
      fileName: row.file_name,
      createdAt: row.created_at,
    }))
  )
}
