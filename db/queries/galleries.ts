import bcrypt from 'bcryptjs'
import { query, queryOne, execute } from '../connection'

export interface Gallery {
  id: number
  slug: string
  title: string
  event_date: string | null
  invitation_id: number | null
  is_public: boolean
  is_active: boolean
  created_at: string
}

export interface GalleryMedia {
  id: number
  gallery_id: number
  object_key: string
  thumb_key: string | null
  file_name: string
  mime_type: string
  size_bytes: number
  media_type: 'image' | 'video'
  uploader_name: string | null
  status: 'uploading' | 'ready'
  created_at: string
}

// --- Galerije ---

export async function getGalleryBySlug(slug: string): Promise<Gallery | null> {
  return queryOne<Gallery>(
    'SELECT id, slug, title, event_date, invitation_id, is_public, is_active, created_at FROM galleries WHERE slug = ? AND is_active = TRUE',
    [slug]
  )
}

// Verzija koja vraća i hash lozinke — samo za couple-login, ne izlagati klijentu.
export async function getGalleryWithSecret(slug: string) {
  return queryOne<Gallery & { couple_password: string }>(
    'SELECT * FROM galleries WHERE slug = ? AND is_active = TRUE',
    [slug]
  )
}

export interface GalleryStats extends Gallery {
  media_count: number
  total_bytes: number
}

export async function getAllGalleries(): Promise<GalleryStats[]> {
  return query<GalleryStats>(
    `SELECT g.id, g.slug, g.title, g.event_date, g.invitation_id, g.is_public,
            g.is_active, g.created_at,
            COUNT(m.id) AS media_count,
            COALESCE(SUM(m.size_bytes), 0) AS total_bytes
     FROM galleries g
     LEFT JOIN gallery_media m ON m.gallery_id = g.id AND m.status = 'ready'
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  )
}

export interface CreateGalleryInput {
  slug: string
  title: string
  eventDate: string | null
  invitationId: number | null
  isPublic: boolean
  couplePassword: string
}

export async function createGallery(input: CreateGalleryInput): Promise<number> {
  const hash = await bcrypt.hash(input.couplePassword, 10)
  const result = await execute(
    `INSERT INTO galleries (slug, title, event_date, invitation_id, is_public, couple_password)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.slug, input.title, input.eventDate, input.invitationId, input.isPublic, hash]
  )
  return result.insertId
}

export async function verifyCouplePassword(slug: string, password: string): Promise<boolean> {
  const gallery = await getGalleryWithSecret(slug)
  if (!gallery) return false
  return bcrypt.compare(password, gallery.couple_password)
}

export async function getGalleryById(id: number): Promise<Gallery | null> {
  return queryOne<Gallery>(
    'SELECT id, slug, title, event_date, invitation_id, is_public, is_active, created_at FROM galleries WHERE id = ?',
    [id]
  )
}

export interface UpdateGalleryInput {
  title?: string
  eventDate?: string | null
  isPublic?: boolean
  couplePassword?: string // ako je zadano, resetuje lozinku mladenaca
}

export async function updateGallery(id: number, input: UpdateGalleryInput): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []

  if (input.title !== undefined) {
    fields.push('title = ?')
    values.push(input.title)
  }
  if (input.eventDate !== undefined) {
    fields.push('event_date = ?')
    values.push(input.eventDate)
  }
  if (input.isPublic !== undefined) {
    fields.push('is_public = ?')
    values.push(input.isPublic)
  }
  if (input.couplePassword) {
    fields.push('couple_password = ?')
    values.push(await bcrypt.hash(input.couplePassword, 10))
  }

  if (fields.length === 0) return
  values.push(id)
  await execute(`UPDATE galleries SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function deleteGallery(id: number): Promise<void> {
  // Media redovi se brišu kaskadno (FK ON DELETE CASCADE);
  // brisanje objekata u bucketu radi pozivalac (lib/s3 deletePrefix).
  await execute('DELETE FROM galleries WHERE id = ?', [id])
}

// --- Media ---

export async function getReadyMedia(galleryId: number): Promise<GalleryMedia[]> {
  return query<GalleryMedia>(
    "SELECT * FROM gallery_media WHERE gallery_id = ? AND status = 'ready' ORDER BY created_at DESC",
    [galleryId]
  )
}

export interface CreateMediaInput {
  galleryId: number
  objectKey: string
  thumbKey: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  mediaType: 'image' | 'video'
  uploaderName: string | null
}

// Kreira red sa status='uploading'; pozvati na init uploada.
export async function createMediaRow(input: CreateMediaInput): Promise<number> {
  const result = await execute(
    `INSERT INTO gallery_media
       (gallery_id, object_key, thumb_key, file_name, mime_type, size_bytes, media_type, uploader_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.galleryId,
      input.objectKey,
      input.thumbKey,
      input.fileName,
      input.mimeType,
      input.sizeBytes,
      input.mediaType,
      input.uploaderName,
    ]
  )
  return result.insertId
}

// Označi red kao 'ready' nakon uspješnog complete-a multiparta.
export async function markMediaReady(id: number): Promise<void> {
  await execute("UPDATE gallery_media SET status = 'ready' WHERE id = ?", [id])
}

export async function getMediaById(id: number): Promise<GalleryMedia | null> {
  return queryOne<GalleryMedia>('SELECT * FROM gallery_media WHERE id = ?', [id])
}

export async function deleteMediaRow(id: number): Promise<void> {
  await execute('DELETE FROM gallery_media WHERE id = ?', [id])
}
