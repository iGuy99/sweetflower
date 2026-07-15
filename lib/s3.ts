import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Readable } from 'node:stream'

// --- Lazy konfiguracija iz env-a ---
// Validacija i kreiranje klijenta se dešavaju pri prvom pozivu (runtime), NE pri
// importu — da `next build` (koji nema runtime env varijable) ne baci grešku.

let _s3: S3Client | null = null

function getS3(): S3Client {
  if (_s3) return _s3

  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET } = process.env
  if (!S3_ENDPOINT || !S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_BUCKET) {
    throw new Error('S3 konfiguracija nedostaje — provjeri S3_* varijable u .env')
  }

  _s3 = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: false, // Hetzner koristi virtual-hosted style
  })
  return _s3
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET nedostaje — provjeri S3_* varijable u .env')
  return bucket
}

// Koliko dugo presigned URL-ovi vrijede.
const PART_URL_TTL = 60 * 60 // 1h — dovoljno za jedan chunk uz retry
const GET_URL_TTL = 60 * 60 // 1h — pregled slika u galeriji

export type MediaType = 'image' | 'video'

// --- Ključevi ---

// Guardovi protiv path traversala unutar bucketa (npr. uuid/ext sa '../' ili '/').
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXT_PATTERN = /^[a-z0-9]{1,10}$/i

export function objectKey(slug: string, uuid: string, ext: string): string {
  if (!UUID_PATTERN.test(uuid) || !EXT_PATTERN.test(ext)) {
    throw new Error('Nevažeći uuid ili ekstenzija')
  }
  return `galleries/${slug}/${uuid}.${ext}`
}

export function thumbKey(slug: string, uuid: string): string {
  if (!UUID_PATTERN.test(uuid)) throw new Error('Nevažeći uuid')
  return `galleries/${slug}/thumbs/${uuid}.jpg`
}

// --- Multipart upload (init → potpiši dijelove → complete/abort) ---

export async function startMultipart(key: string, contentType: string): Promise<string> {
  const res = await getS3().send(
    new CreateMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
    })
  )
  if (!res.UploadId) throw new Error('S3 nije vratio UploadId')
  return res.UploadId
}

export async function signUploadPart(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: getBucket(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  })
  return getSignedUrl(getS3(), command, { expiresIn: PART_URL_TTL })
}

export interface CompletedPart {
  PartNumber: number
  ETag: string
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: CompletedPart[]
): Promise<void> {
  const ordered = [...parts].sort((a, b) => a.PartNumber - b.PartNumber)
  await getS3().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: ordered },
    })
  )
}

export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  await getS3().send(
    new AbortMultipartUploadCommand({ Bucket: getBucket(), Key: key, UploadId: uploadId })
  )
}

// --- Jednostavan presigned PUT (za thumbnaile — mali, bez multiparta) ---

export async function signSimpleUpload(key: string, contentType: string): Promise<string> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType })
  return getSignedUrl(getS3(), command, { expiresIn: PART_URL_TTL })
}

// --- Čitanje (presigned GET za pregled) ---

// downloadName: ako je zadano, S3 vraća Content-Disposition: attachment pa
// browser forsira preuzimanje (umjesto otvaranja u tabu) — radi i cross-origin.
export async function signDownload(key: string, downloadName?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ...(downloadName
      ? {
          ResponseContentDisposition: `attachment; filename="${downloadName
            .replace(/[^\w.\- ]/g, '_')
            .slice(0, 100)}"`,
        }
      : {}),
  })
  return getSignedUrl(getS3(), command, { expiresIn: GET_URL_TTL })
}

// Node Readable stream objekta — za streaming ZIP-a (mladenci download).
export async function getObjectStream(key: string): Promise<Readable> {
  const res = await getS3().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }))
  if (!res.Body) throw new Error(`S3 objekat nema tijelo: ${key}`)
  return res.Body as Readable
}

// Stvarna veličina objekta na bucketu (za provjeru da upload ne prelazi limit).
export async function headObjectSize(key: string): Promise<number> {
  const res = await getS3().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }))
  return res.ContentLength ?? 0
}

// --- Brisanje ---

export async function deleteKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  // DeleteObjects prima max 1000 ključeva po pozivu.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await getS3().send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    )
  }
}

// Obriši sve objekte pod prefiksom (cijela galerija: originali + thumbs).
export async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined
  do {
    const listed = await getS3().send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )
    const keys = (listed.Contents ?? []).map((o) => o.Key!).filter(Boolean)
    await deleteKeys(keys)
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (continuationToken)
}
