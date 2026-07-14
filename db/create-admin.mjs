// Kreira (ili resetuje lozinku) admin nalog u tabeli `admins`.
// Lozinka se NE čuva nigdje — samo bcrypt hash ide u bazu.
//
// Upotreba:
//   node db/create-admin.mjs <username> <password>
// Primjer:
//   node db/create-admin.mjs ismetcosic "moja-jaka-lozinka"

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

const [, , username, password] = process.argv
if (!username || !password) {
  console.error('Upotreba: node db/create-admin.mjs <username> <password>')
  process.exit(1)
}

// Učitaj DB_* iz .env.local (ručni parse — fajl ima i ne-KEY=value linije).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim()
}

const hash = await bcrypt.hash(password, 10)

const conn = await mysql.createConnection({
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT || '3306'),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})

await conn.execute(
  `INSERT INTO admins (username, password_hash) VALUES (?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
  [username, hash]
)

await conn.end()
console.log(`✅ Admin nalog '${username}' je spreman (lozinka postavljena).`)
