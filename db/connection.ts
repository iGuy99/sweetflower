import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 10000,
  timezone: '+00:00',
})

// SELECT queriji — koristimo pool.query() umjesto execute() zbog MySQL 8 buga sa LIMIT ?
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params)
  return rows as T[]
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] || null
}

// INSERT/UPDATE/DELETE
export async function execute(sql: string, params?: any[]): Promise<any> {
  const [result] = await pool.execute(sql, params)
  return result
}

export { pool }
