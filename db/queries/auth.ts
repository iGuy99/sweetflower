import { queryOne } from '../connection'
import bcrypt from 'bcryptjs'

export async function verifyInvitationAdmin(slug: string, username: string, password: string) {
  const invitation = await queryOne<{ id: number; admin_username: string; admin_password: string }>(
    'SELECT id, admin_username, admin_password FROM invitations WHERE slug = ? AND is_active = TRUE',
    [slug]
  )

  if (!invitation) return null
  if (invitation.admin_username !== username) return null

  const valid = await bcrypt.compare(password, invitation.admin_password)
  if (!valid) return null

  return { id: invitation.id }
}
