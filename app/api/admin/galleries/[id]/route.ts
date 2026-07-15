import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getGalleryById, updateGallery, deleteGallery } from '@/db/queries/galleries'
import { deletePrefix } from '@/lib/s3'
import { validateTheme, type GalleryTheme } from '@/lib/gallery-themes'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const galleryId = Number(id)
  if (!Number.isInteger(galleryId)) {
    return NextResponse.json({ error: 'Neispravan ID' }, { status: 400 })
  }

  const gallery = await getGalleryById(galleryId)
  if (!gallery) return NextResponse.json({ error: 'Galerija ne postoji' }, { status: 404 })

  try {
    const body = await req.json()

    let theme: GalleryTheme | null | undefined = undefined
    if ('theme' in body) {
      if (body.theme === null) {
        theme = null // reset na default
      } else {
        theme = validateTheme(body.theme)
        if (!theme) {
          return NextResponse.json({ error: 'Nevažeća tema' }, { status: 400 })
        }
      }
    }

    await updateGallery(galleryId, {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      eventDate: body.eventDate !== undefined ? (body.eventDate ? String(body.eventDate) : null) : undefined,
      isPublic: body.isPublic !== undefined ? body.isPublic === true : undefined,
      couplePassword: body.couplePassword ? String(body.couplePassword) : undefined,
      theme,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update gallery error:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const galleryId = Number(id)
  if (!Number.isInteger(galleryId)) {
    return NextResponse.json({ error: 'Neispravan ID' }, { status: 400 })
  }

  const gallery = await getGalleryById(galleryId)
  if (!gallery) return NextResponse.json({ error: 'Galerija ne postoji' }, { status: 404 })

  try {
    // Prvo obriši objekte u bucketu (originali + thumbs), pa red u bazi.
    // Redoslijed je bitan: ako brisanje bucketa padne, red ostaje pa se može ponoviti.
    await deletePrefix(`galleries/${gallery.slug}/`)
    await deleteGallery(galleryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete gallery error:', error)
    return NextResponse.json({ error: 'Greška pri brisanju galerije' }, { status: 500 })
  }
}
