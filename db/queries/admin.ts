import bcrypt from 'bcryptjs'
import { query, queryOne, execute } from '../connection'

// Dummy hash za izjednačavanje vremena kad username ne postoji (anti-enumeracija).
// Bcrypt hash nasumičnog stringa — poređenje uvijek pada, ali troši isto vremena.
// Exportovan: koristi ga i verifyCouplePassword (isti timing problem sa slugovima).
export const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8DvywQnQK6i7g8Zt5eKQ4hV3pZ8pXe'

export interface AdminAccount {
  id: number
  username: string
  role: 'super' | 'admin'
  created_at: string
}

// Centralni admin nalog (SweetFlower). Jedan zajednički nalog za sada.
export async function verifyAdmin(username: string, password: string) {
  const admin = await queryOne<{
    id: number
    username: string
    password_hash: string
    role: 'super' | 'admin'
  }>('SELECT id, username, password_hash, role FROM admins WHERE username = ?', [username])

  if (!admin) {
    // Uradi dummy compare da vrijeme odgovora ne otkriva postoji li username.
    await bcrypt.compare(password, DUMMY_HASH)
    return null
  }

  const passwordMatch = await bcrypt.compare(password, admin.password_hash)
  if (!passwordMatch) return null

  return { id: admin.id, username: admin.username, role: admin.role }
}

// --- Upravljanje admin nalozima (samo superadmin) ---

export async function listAdmins(): Promise<AdminAccount[]> {
  return query<AdminAccount>(
    'SELECT id, username, role, created_at FROM admins ORDER BY created_at ASC'
  )
}

export async function createAdmin(username: string, password: string): Promise<number> {
  const hash = await bcrypt.hash(password, 10)
  const result = await execute(
    "INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'admin')",
    [username, hash]
  )
  return result.insertId
}

export async function getAdminById(id: number): Promise<AdminAccount | null> {
  return queryOne<AdminAccount>(
    'SELECT id, username, role, created_at FROM admins WHERE id = ?',
    [id]
  )
}

export async function deleteAdmin(id: number): Promise<void> {
  await execute('DELETE FROM admins WHERE id = ?', [id])
}

export async function updateAdminPassword(id: number, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10)
  await execute('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, id])
}
