import { query, queryOne } from '../connection'

export interface Invitation {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  wedding_date: string | null
  wedding_venue: string | null
  component_name: string
  admin_username: string
  show_phone: boolean
  show_guest_count: boolean
  show_allergies: boolean
  show_song_request: boolean
  show_message: boolean
  is_active: boolean
  created_at: string
}

export async function getInvitationBySlug(slug: string): Promise<Invitation | null> {
  return queryOne<Invitation>(
    'SELECT * FROM invitations WHERE slug = ? AND is_active = TRUE',
    [slug]
  )
}

export async function getAllInvitations(): Promise<Invitation[]> {
  return query<Invitation>('SELECT * FROM invitations ORDER BY created_at DESC')
}
