import bcrypt from 'bcryptjs'
import { queryOne } from '../connection'

// Dummy hash za izjednačavanje vremena kad username ne postoji (anti-enumeracija).
// Bcrypt hash nasumičnog stringa — poređenje uvijek pada, ali troši isto vremena.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8DvywQnQK6i7g8Zt5eKQ4hV3pZ8pXe'

// Centralni admin nalog (SweetFlower). Jedan zajednički nalog za sada.
export async function verifyAdmin(username: string, password: string) {
  const admin = await queryOne<{ id: number; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM admins WHERE username = ?',
    [username]
  )

  if (!admin) {
    // Uradi dummy compare da vrijeme odgovora ne otkriva postoji li username.
    await bcrypt.compare(password, DUMMY_HASH)
    return null
  }

  const passwordMatch = await bcrypt.compare(password, admin.password_hash)
  if (!passwordMatch) return null

  return { id: admin.id, username: admin.username }
}
