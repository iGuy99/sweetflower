import { SignJWT, jwtVerify } from 'jose'

// Lazy: čitamo secret pri pozivu (runtime), ne pri importu — da `next build`
// (koji nema runtime env) ne baci grešku pri učitavanju modula.
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET nedostaje — provjeri env varijable')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: Record<string, any>, expiresIn = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}
