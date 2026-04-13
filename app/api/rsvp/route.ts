import { NextRequest, NextResponse } from 'next/server'
import { getInvitationBySlug } from '@/db/queries/invitations'
import { createRsvp } from '@/db/queries/rsvp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      slug, full_name, phone, attending, guest_count,
      gluten_free, lactose_free, vegetarian, vegan,
      nut_allergy, seafood_allergy, other_allergies,
      song_request, message,
    } = body

    if (!slug || !full_name || attending === undefined) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja' }, { status: 400 })
    }

    const invitation = await getInvitationBySlug(slug)
    if (!invitation) {
      return NextResponse.json({ error: 'Pozivnica nije pronađena' }, { status: 404 })
    }

    await createRsvp({
      invitation_id: invitation.id,
      full_name: full_name.trim(),
      phone: phone?.trim() || undefined,
      attending: attending === 'yes' || attending === true,
      guest_count: parseInt(guest_count) || 1,
      gluten_free: !!gluten_free,
      lactose_free: !!lactose_free,
      vegetarian: !!vegetarian,
      vegan: !!vegan,
      nut_allergy: !!nut_allergy,
      seafood_allergy: !!seafood_allergy,
      other_allergies: other_allergies?.trim() || undefined,
      song_request: song_request?.trim() || undefined,
      message: message?.trim() || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('RSVP error:', error)
    return NextResponse.json({ error: 'Greška pri slanju' }, { status: 500 })
  }
}
