import AmarRodjendan from '@/components/pozivnice/AmarRodjendan'
import type { Invitation } from '@/db/queries/invitations'

const mockInvitation: Invitation = {
  id: 3,
  slug: 'AmarRodjendan',
  bride_name: 'Amar',
  groom_name: '',
  wedding_date: '2026-05-31',
  wedding_venue: 'Dedina Luka',
  component_name: 'AmarRodjendan',
  admin_username: 'amar',
  show_phone: false,
  show_guest_count: true,
  show_allergies: false,
  show_song_request: false,
  show_message: false,
  custom_fields: null,
  is_active: true,
  created_at: new Date().toISOString(),
}

export default function AmarRodjendanPage() {
  return <AmarRodjendan invitation={mockInvitation} />
}
