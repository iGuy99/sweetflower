import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getAllGalleries, createGallery, getGalleryBySlug } from '@/db/queries/galleries'
import { isValidSlug } from '@/lib/slug'

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const galleries = await getAllGalleries()
  return NextResponse.json({ galleries })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const slug = String(body.slug ?? '').trim().toLowerCase()
    const couplePassword = String(body.couplePassword ?? '')
    const eventDate = body.eventDate ? String(body.eventDate) : null
    const isPublic = body.isPublic === true // striktno: "false" string ne smije postati true
    const invitationId = Number.isFinite(Number(body.invitationId))
      ? Number(body.invitationId)
      : null

    if (!title || title.length > 200) {
      return NextResponse.json({ error: 'Naslov je obavezan (max 200 znakova)' }, { status: 400 })
    }
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Slug smije sadržavati samo mala slova, brojeve i crtice (npr. amila-emir)' },
        { status: 400 }
      )
    }
    if (couplePassword.length < 8) {
      return NextResponse.json(
        { error: 'Lozinka za mladence mora imati bar 8 znakova' },
        { status: 400 }
      )
    }
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return NextResponse.json({ error: 'Datum mora biti u formatu GGGG-MM-DD' }, { status: 400 })
    }
    if (await getGalleryBySlug(slug)) {
      return NextResponse.json({ error: 'Galerija s ovim slugom već postoji' }, { status: 409 })
    }

    const id = await createGallery({ slug, title, eventDate, invitationId, isPublic, couplePassword })
    return NextResponse.json({ success: true, id, slug }, { status: 201 })
  } catch (error) {
    console.error('Create gallery error:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju galerije' }, { status: 500 })
  }
}
