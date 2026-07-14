/**
 * multipart-uploader.ts — klijentski S3 multipart uploader (bez React-a).
 *
 * Uploaduje JEDAN fajl kroz S3 multipart preko presigned URL-ova:
 *   1. init      -> mediaId, objectKey, uploadId, thumbUploadUrl, partSize
 *   2. za svaki chunk: sign-part -> PUT (xhr, progress + ETag)
 *   3. complete  -> potvrdi sve dijelove
 *   4. abort     -> otkaži multipart na grešku / otkazivanju
 *
 * Karakteristike:
 *   - max 3 chunka paralelno (worker pool nad zajedničkim redom)
 *   - retry po chunku: do 4 pokušaja, exp. backoff + jitter, samo mreža/5xx
 *   - HTTP 403 (istekao presigned URL) -> re-sign i pokušaj ponovo (ne troši retry)
 *   - ostali 4xx -> trajni fail fajla
 *   - agregiran progress preko POTVRĐENIH bajtova (ne skače unazad na retry)
 *   - otkazivanje preko AbortSignal usred uploada
 *   - thumbnail (ako thumbUploadUrl postoji) upload-uje se paralelno, best-effort
 */

import { generateThumbnail } from './thumbnail'

// --- Konfiguracija ---
const MAX_CONCURRENT_PARTS = 3
const MAX_PART_ATTEMPTS = 4
const MAX_RESIGNS = 3 // koliko puta re-sign na uzastopni 403 prije nego odustanemo
const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 8000
const STALL_TIMEOUT_MS = 45000 // nema progresa toliko -> smatraj zastojem i prekini (retriable)
const THUMB_MIME = 'image/jpeg'

// --- Tipovi ---

export interface UploadOptions {
  /** Ime gosta (opcionalno) — šalje se u init. */
  uploaderName?: string
  /** Progres 0..1, agregiran po potvrđenim bajtovima; monotono raste. */
  onProgress?: (fraction: number) => void
  /** Otkazivanje uploada usred rada. */
  signal?: AbortSignal
}

export interface UploadResult {
  mediaId: number
}

interface InitResponse {
  mediaId: number
  objectKey: string
  uploadId: string
  thumbUploadUrl: string | null
  partSize: number
}

interface CompletedPart {
  PartNumber: number
  ETag: string
}

/** Greška koja označava da je korisnik otkazao upload. */
export class UploadAbortedError extends Error {
  constructor(message = 'Upload otkazan') {
    super(message)
    this.name = 'UploadAbortedError'
  }
}

/** Greška uploada; `status` nosi HTTP kod ako potiče od našeg backenda. */
export class UploadError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'UploadError'
    this.status = status
  }
}

// --- Pomoćne funkcije ---

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadAbortedError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new UploadAbortedError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Backoff sa jitterom: 1s, 2s, 4s, 8s (cap) ± do 25% slučajno. */
function backoffDelay(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS)
  const jitter = base * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(base + jitter))
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new UploadAbortedError()
}

/** Rezultat jednog PUT pokušaja preko XHR-a. */
interface XhrPutResult {
  status: number
  etag: string | null
}

/**
 * PUT jednog blob-a preko XMLHttpRequest (za upload progress i ETag header).
 * Rješava se s HTTP statusom (uključujući 4xx/5xx); odbija SAMO na
 * mrežnu grešku ili otkazivanje.
 */
function xhrPut(
  url: string,
  body: Blob,
  opts: {
    contentType?: string
    signal?: AbortSignal
    onProgress?: (loadedBytes: number) => void
  } = {}
): Promise<XhrPutResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new UploadAbortedError())
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    if (opts.contentType) {
      xhr.setRequestHeader('Content-Type', opts.contentType)
    }

    // Stall watchdog: ako nema napretka STALL_TIMEOUT_MS, prekini (retriable).
    let stalled = false
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        stalled = true
        xhr.abort()
      }, STALL_TIMEOUT_MS)
    }

    const onAbort = () => {
      xhr.abort()
    }
    opts.signal?.addEventListener('abort', onAbort, { once: true })

    const cleanup = () => {
      if (watchdog) clearTimeout(watchdog)
      opts.signal?.removeEventListener('abort', onAbort)
    }

    if (xhr.upload) {
      xhr.upload.onprogress = (e: ProgressEvent) => {
        armWatchdog() // svaki napredak resetuje watchdog
        if (opts.onProgress && e.lengthComputable) opts.onProgress(e.loaded)
      }
    }

    xhr.onload = () => {
      cleanup()
      // ETag je nužan za complete; header može biti pod navodnicima.
      const etag = xhr.getResponseHeader('ETag')
      resolve({ status: xhr.status, etag })
    }

    xhr.onerror = () => {
      cleanup()
      reject(new Error('Mrežna greška pri uploadu'))
    }

    xhr.onabort = () => {
      cleanup()
      // Zastoj je retriable mrežna greška; stvarno korisničko otkazivanje nije.
      if (stalled) {
        reject(new Error('Upload je zastao'))
      } else {
        reject(new UploadAbortedError())
      }
    }

    armWatchdog()
    xhr.send(body)
  })
}

/** POST JSON na naš backend; vraća parsirano tijelo. Baca UploadError na ne-2xx. */
async function postJson<T>(
  url: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw new UploadAbortedError()
    throw new Error('Mrežna greška')
  }

  if (!res.ok) {
    let message = `Zahtjev nije uspio (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = String(data.error)
    } catch {
      // tijelo nije JSON — zadrži generičku poruku
    }
    throw new UploadError(message, res.status)
  }

  return (await res.json()) as T
}

// --- Uploader ---

/** Interno stanje jednog chunka. */
interface PartState {
  partNumber: number
  start: number
  end: number
  size: number
  etag: string | null
  confirmedBytes: number
}

class FileUploader {
  private readonly slug: string
  private readonly file: File
  private readonly opts: UploadOptions
  private readonly signal?: AbortSignal

  private init?: InitResponse
  private parts: PartState[] = []
  private totalBytes = 0
  private lastReportedFraction = 0

  constructor(slug: string, file: File, opts: UploadOptions) {
    this.slug = slug
    this.file = file
    this.opts = opts
    this.signal = opts.signal
  }

  private base(): string {
    return `/api/galerija/${encodeURIComponent(this.slug)}/upload`
  }

  async run(): Promise<UploadResult> {
    throwIfAborted(this.signal)

    // 1) init
    this.init = await postJson<InitResponse>(
      `${this.base()}/init`,
      {
        fileName: this.file.name,
        mimeType: this.file.type,
        sizeBytes: this.file.size,
        uploaderName: this.opts.uploaderName || undefined,
      },
      this.signal
    )

    // Guard: neispravan partSize bi napravio beskonačnu petlju u buildParts.
    if (!Number.isFinite(this.init.partSize) || this.init.partSize <= 0) {
      throw new UploadError('Neispravna veličina dijela iz servera')
    }
    this.buildParts(this.init.partSize)

    // 2) upload — original (chunkovi) + thumbnail paralelno
    const thumbPromise = this.uploadThumbnail()

    try {
      await this.uploadAllParts()
      throwIfAborted(this.signal)

      // 3) complete (uz retry — najskuplji poziv, dolazi nakon cijelog fajla)
      const parts: CompletedPart[] = this.parts
        .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag ?? '' }))
        .sort((a, b) => a.PartNumber - b.PartNumber)

      await this.completeWithRetry(parts)

      // Thumb ne smije oboriti glavni upload; sačekaj ga tiho.
      await thumbPromise.catch(() => undefined)

      this.report(1)
      return { mediaId: this.init.mediaId }
    } catch (err) {
      await thumbPromise.catch(() => undefined)
      await this.tryAbort()
      throw err
    }
  }

  /** Complete sa retry-em: jedan tranzijentni blip ne smije baciti cijeli 1GB upload. */
  private async completeWithRetry(parts: CompletedPart[]): Promise<void> {
    if (!this.init) throw new UploadError('Upload nije inicijalizovan')
    let attempt = 0
    while (true) {
      throwIfAborted(this.signal)
      try {
        await postJson<{ success: boolean }>(
          `${this.base()}/complete`,
          {
            mediaId: this.init.mediaId,
            objectKey: this.init.objectKey,
            uploadId: this.init.uploadId,
            parts,
          },
          this.signal
        )
        return
      } catch (err) {
        if (err instanceof UploadAbortedError) throw err
        // Trajni klijentski problem (4xx osim 429) -> odustani.
        if (
          err instanceof UploadError &&
          err.status &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429
        ) {
          throw err
        }
        attempt += 1
        if (attempt >= MAX_PART_ATTEMPTS) throw err
        await sleep(backoffDelay(attempt - 1), this.signal)
      }
    }
  }

  private buildParts(partSize: number): void {
    const size = this.file.size
    this.totalBytes = size
    const parts: PartState[] = []
    let partNumber = 1
    for (let start = 0; start < size; start += partSize) {
      const end = Math.min(start + partSize, size)
      parts.push({
        partNumber,
        start,
        end,
        size: end - start,
        etag: null,
        confirmedBytes: 0,
      })
      partNumber += 1
    }
    // Rub: prazan fajl -> jedan prazan part (init to inače odbija, ali budi robustan).
    if (parts.length === 0) {
      parts.push({
        partNumber: 1,
        start: 0,
        end: 0,
        size: 0,
        etag: null,
        confirmedBytes: 0,
      })
    }
    this.parts = parts
  }

  /** Worker-pool nad indeksima dijelova; max MAX_CONCURRENT_PARTS istovremeno. */
  private async uploadAllParts(): Promise<void> {
    const queue = this.parts
      .map((_, i) => i)
      .filter((i) => this.parts[i].etag === null)

    let cursor = 0
    const workerCount = Math.min(MAX_CONCURRENT_PARTS, queue.length)

    const worker = async (): Promise<void> => {
      while (true) {
        throwIfAborted(this.signal)
        const idx = cursor
        cursor += 1
        if (idx >= queue.length) return
        await this.uploadPartWithRetry(this.parts[queue[idx]])
      }
    }

    const workers: Promise<void>[] = []
    for (let i = 0; i < workerCount; i += 1) workers.push(worker())
    await Promise.all(workers)
  }

  /**
   * Upload jednog dijela sa retry logikom.
   * - mreža/5xx: retry uz backoff (do MAX_PART_ATTEMPTS)
   * - 403: re-sign URL i pokušaj ponovo BEZ trošenja retry budžeta
   * - ostali 4xx / prazan ETag: trajni fail
   */
  private async uploadPartWithRetry(part: PartState): Promise<void> {
    const blob = this.file.slice(part.start, part.end)
    let attempt = 0
    let resigns = 0

    while (true) {
      throwIfAborted(this.signal)

      let signedUrl: string
      try {
        signedUrl = await this.signPart(part.partNumber)
      } catch (err) {
        if (err instanceof UploadAbortedError) throw err
        // Trajni klijentski problem (400/404/409) -> odustani odmah, ne retry-aj.
        if (
          err instanceof UploadError &&
          err.status &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429
        ) {
          throw err
        }
        // Mreža / 5xx / 429 -> retry uz backoff.
        attempt = await this.waitRetryOrThrow(attempt, err, part)
        continue
      }

      let result: XhrPutResult
      try {
        result = await xhrPut(signedUrl, blob, {
          signal: this.signal,
          onProgress: (loaded) => this.onPartProgress(part, loaded),
        })
      } catch (err) {
        if (err instanceof UploadAbortedError) throw err
        // Mrežna greška / zastoj -> retry uz backoff.
        this.resetPartProgress(part)
        attempt = await this.waitRetryOrThrow(attempt, err, part)
        continue
      }

      if (result.status === 403) {
        // Istekao presigned URL -> re-sign i ponovi, ali OGRANIČENO (uz backoff).
        // Uporni 403 (ne samo istek) ne smije praviti beskonačnu tight-loop petlju.
        this.resetPartProgress(part)
        resigns += 1
        if (resigns > MAX_RESIGNS) {
          attempt = await this.waitRetryOrThrow(
            attempt,
            new Error('Ponovljeni 403 pri uploadu dijela'),
            part
          )
        } else {
          await sleep(backoffDelay(resigns - 1), this.signal)
        }
        continue
      }

      if (result.status >= 500) {
        this.resetPartProgress(part)
        attempt = await this.waitRetryOrThrow(
          attempt,
          new Error(`Server greška (${result.status})`),
          part
        )
        continue
      }

      if (result.status < 200 || result.status >= 300) {
        // Ostali 4xx -> trajni fail.
        throw new UploadError(
          `Upload dijela ${part.partNumber} odbijen (${result.status})`
        )
      }

      if (!result.etag) {
        // Bez ETag-a complete pada — tretiraj kao retriable.
        this.resetPartProgress(part)
        attempt = await this.waitRetryOrThrow(
          attempt,
          new Error('Nedostaje ETag u odgovoru'),
          part
        )
        continue
      }

      // Uspjeh: zabilježi ETag i potvrđene bajtove.
      part.etag = result.etag
      part.confirmedBytes = part.size
      this.reportAggregate()
      return
    }
  }

  private async waitRetryOrThrow(
    attempt: number,
    err: unknown,
    part: PartState
  ): Promise<number> {
    const next = attempt + 1
    if (next >= MAX_PART_ATTEMPTS) {
      const reason = err instanceof Error ? err.message : 'nepoznata greška'
      throw new UploadError(
        `Dio ${part.partNumber} nije uspio nakon ${MAX_PART_ATTEMPTS} pokušaja: ${reason}`
      )
    }
    await sleep(backoffDelay(attempt), this.signal)
    return next
  }

  private async signPart(partNumber: number): Promise<string> {
    if (!this.init) throw new UploadError('Upload nije inicijalizovan')
    const res = await postJson<{ url: string }>(
      `${this.base()}/sign-part`,
      {
        mediaId: this.init.mediaId,
        objectKey: this.init.objectKey,
        uploadId: this.init.uploadId,
        partNumber,
      },
      this.signal
    )
    return res.url
  }

  // --- Progress ---

  /** Live progress tokom PUT-a jednog dijela (privremeni, ne-potvrđeni bajtovi). */
  private onPartProgress(part: PartState, loadedBytes: number): void {
    const clamped = Math.min(loadedBytes, part.size)
    // Live bajtovi ulaze samo za dijelove koji još nisu potvrđeni.
    if (part.etag !== null) return
    part.confirmedBytes = clamped
    this.reportAggregate()
  }

  private resetPartProgress(part: PartState): void {
    if (part.etag !== null) return
    part.confirmedBytes = 0
    this.reportAggregate()
  }

  private reportAggregate(): void {
    if (this.totalBytes <= 0) {
      this.report(1)
      return
    }
    const loaded = this.parts.reduce((sum, p) => sum + p.confirmedBytes, 0)
    this.report(loaded / this.totalBytes)
  }

  /** Monotoni izvještaj: nikada ne ide unazad (štiti od skoka pri retry-u). */
  private report(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    if (clamped < this.lastReportedFraction) return
    this.lastReportedFraction = clamped
    this.opts.onProgress?.(clamped)
  }

  // --- Thumbnail (best-effort) ---

  private async uploadThumbnail(): Promise<void> {
    const url = this.init?.thumbUploadUrl
    if (!url) return
    let thumb: Blob | null = null
    try {
      thumb = await generateThumbnail(this.file)
    } catch {
      thumb = null
    }
    if (!thumb) return // npr. HEIC — preskoči, nije fatalno

    try {
      await xhrPut(url, thumb, {
        contentType: THUMB_MIME,
        signal: this.signal,
      })
    } catch {
      // Thumb greška nije fatalna za glavni upload.
    }
  }

  // --- Abort ---

  private async tryAbort(): Promise<void> {
    if (!this.init) return
    try {
      await fetch(`${this.base()}/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: this.init.mediaId,
          objectKey: this.init.objectKey,
          uploadId: this.init.uploadId,
        }),
        keepalive: true,
      })
    } catch {
      // Best-effort čišćenje; ignoriši grešku.
    }
  }
}

/**
 * Uploaduj jedan fajl kroz S3 multipart.
 *
 * @param slug   slug galerije
 * @param file   fajl za upload (slika ili video, do 1GB)
 * @param opts   uploaderName, onProgress(0..1), signal (AbortSignal)
 * @returns      { mediaId } po uspješnom complete-u
 * @throws       UploadAbortedError na otkazivanje, UploadError na trajni fail
 */
export function uploadFile(
  slug: string,
  file: File,
  opts: UploadOptions = {}
): Promise<UploadResult> {
  return new FileUploader(slug, file, opts).run()
}
