import ZaraRodjendan from '@/components/pozivnice/ZaraRodjendan'
import type { Invitation } from '@/db/queries/invitations'

const mockInvitation: Invitation = {
  id: 0,
  slug: 'ZaraRodjendan',
  bride_name: 'Zara',
  groom_name: '',
  wedding_date: '2026-04-29',
  wedding_venue: 'B&G Caffe & Restaurant Breza',
  component_name: 'ZaraRodjendan',
  admin_username: 'zara',
  show_phone: false,
  show_guest_count: false,
  show_allergies: false,
  show_song_request: false,
  show_message: false,
  is_active: true,
  created_at: '',
}

export default function ZaraRodjendanPage() {
  return <ZaraRodjendan invitation={mockInvitation} />
}
