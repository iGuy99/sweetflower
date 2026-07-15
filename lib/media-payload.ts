import type { GalleryMedia } from '@/db/queries/galleries'
import { signDownload } from '@/lib/s3'

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
