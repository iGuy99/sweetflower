/**
 * thumbnail.ts — generisanje thumbnaila u browseru (bez zavisnosti).
 *
 * Za slike: crta na canvas skalirano na ~400px veću stranu i izvozi JPEG.
 * Za video: uzima poster frame (seek na ~1s) i izvozi JPEG.
 * Ako format nije podržan (npr. HEIC koji browser ne dekodira) -> vraća null.
 *
 * Rezultat je uvijek JPEG Blob ili null; nikada ne baca — thumb je best-effort.
 */

// Ciljna dužina veće stranice thumbnaila u pikselima.
const THUMB_MAX_EDGE = 400
// JPEG kvalitet (0..1).
const THUMB_QUALITY = 0.8
// Trenutak (sekunde) na koji tražimo poster frame videa.
const VIDEO_POSTER_TIME_SEC = 1
// Sigurnosni timeout za video dekodiranje/seek.
const VIDEO_TIMEOUT_MS = 10000

interface Dimensions {
  width: number
  height: number
}

/**
 * Izračunaj skalirane dimenzije tako da veća strana bude <= THUMB_MAX_EDGE,
 * uz očuvanje omjera. Nikada ne uvećava iznad originala.
 */
function scaledDimensions(natural: Dimensions): Dimensions {
  const { width, height } = natural
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const longEdge = Math.max(width, height)
  if (longEdge <= THUMB_MAX_EDGE) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = THUMB_MAX_EDGE / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Nacrtaj izvor na canvas i izvezi JPEG Blob (ili null ako ne uspije). */
function drawToJpeg(
  source: CanvasImageSource,
  natural: Dimensions
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const { width, height } = scaledDimensions(natural)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(source, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        THUMB_QUALITY
      )
    } catch {
      // Najčešće SecurityError (tainted canvas) ili nepodržan izvor.
      resolve(null)
    }
  })
}

/** Thumbnail za sliku preko createImageBitmap (bez DOM <img> dekodiranja). */
async function imageThumbnail(file: File): Promise<Blob | null> {
  // createImageBitmap je najpouzdaniji put; HEIC/HEIF obično baci -> null.
  if (typeof createImageBitmap !== 'function') return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  try {
    return await drawToJpeg(bitmap, {
      width: bitmap.width,
      height: bitmap.height,
    })
  } finally {
    bitmap.close()
  }
}

/** Thumbnail za video: učitaj metapodatke, seek na ~1s, uhvati frame. */
function videoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        // ignoriši — samo oslobađamo resurse
      }
    }

    const finish = (blob: Blob | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve(blob)
    }

    const timer = setTimeout(() => finish(null), VIDEO_TIMEOUT_MS)

    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'

    video.onloadedmetadata = () => {
      // Seek malo unutar klipa, ali ne preko njegovog trajanja.
      const target = Number.isFinite(video.duration)
        ? Math.min(VIDEO_POSTER_TIME_SEC, Math.max(0, video.duration / 2))
        : VIDEO_POSTER_TIME_SEC
      try {
        video.currentTime = target
      } catch {
        finish(null)
      }
    }

    video.onseeked = async () => {
      const blob = await drawToJpeg(video, {
        width: video.videoWidth,
        height: video.videoHeight,
      })
      finish(blob)
    }

    video.onerror = () => finish(null)

    video.src = url
  })
}

/**
 * Generiši thumbnail za dati fajl.
 * @returns JPEG Blob ili null ako format nije podržan / dekodiranje padne.
 */
export async function generateThumbnail(file: File): Promise<Blob | null> {
  try {
    if (file.type.startsWith('image/')) {
      return await imageThumbnail(file)
    }
    if (file.type.startsWith('video/')) {
      return await videoThumbnail(file)
    }
    return null
  } catch {
    return null
  }
}
