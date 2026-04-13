import { queryOne } from '../connection'

export async function verifyInvitationAdmin(slug: string, username: string, password: string) {
  const invitation = await queryOne<{ id: number; admin_username: string; admin_password: string }>(
    'SELECT id, admin_username, admin_password FROM invitations WHERE slug = ? AND is_active = TRUE',
    [slug]
  )

  if (!invitation) return null
  if (invitation.admin_username !== username) return null
  if (invitation.admin_password !== password) return null

  return { id: invitation.id }
}
