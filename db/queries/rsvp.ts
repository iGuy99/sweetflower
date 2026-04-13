import { query, queryOne, execute } from '../connection'

export interface RsvpResponse {
  id: number
  invitation_id: number
  full_name: string
  phone: string | null
  attending: boolean
  guest_count: number
  gluten_free: boolean
  lactose_free: boolean
  vegetarian: boolean
  vegan: boolean
  nut_allergy: boolean
  seafood_allergy: boolean
  other_allergies: string | null
  song_request: string | null
  message: string | null
  created_at: string
}

export interface RsvpStats {
  total_responses: number
  attending_count: number
  not_attending_count: number
  total_guests: number
}

export interface CreateRsvpData {
  invitation_id: number
  full_name: string
  phone?: string
  attending: boolean
  guest_count?: number
  gluten_free?: boolean
  lactose_free?: boolean
  vegetarian?: boolean
  vegan?: boolean
  nut_allergy?: boolean
  seafood_allergy?: boolean
  other_allergies?: string
  song_request?: string
  message?: string
}

export async function createRsvp(data: CreateRsvpData) {
  return execute(
    `INSERT INTO rsvp_responses
     (invitation_id, full_name, phone, attending, guest_count, gluten_free, lactose_free,
      vegetarian, vegan, nut_allergy, seafood_allergy, other_allergies, song_request, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.invitation_id, data.full_name, data.phone || null,
      data.attending, data.guest_count || 1,
      data.gluten_free || false, data.lactose_free || false,
      data.vegetarian || false, data.vegan || false,
      data.nut_allergy || false, data.seafood_allergy || false,
      data.other_allergies || null, data.song_request || null,
      data.message || null,
    ]
  )
}

export async function getRsvpByInvitation(invitationId: number): Promise<RsvpResponse[]> {
  return query<RsvpResponse>(
    'SELECT * FROM rsvp_responses WHERE invitation_id = ? ORDER BY created_at DESC',
    [invitationId]
  )
}

export async function getRsvpStats(invitationId: number): Promise<RsvpStats> {
  const result = await queryOne<RsvpStats>(
    `SELECT
      COUNT(*) as total_responses,
      SUM(attending = TRUE) as attending_count,
      SUM(attending = FALSE) as not_attending_count,
      SUM(CASE WHEN attending = TRUE THEN guest_count ELSE 0 END) as total_guests
     FROM rsvp_responses WHERE invitation_id = ?`,
    [invitationId]
  )
  return result!
}
