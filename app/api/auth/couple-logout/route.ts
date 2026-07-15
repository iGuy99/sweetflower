import { NextResponse } from 'next/server'
import { COUPLE_COOKIE } from '@/lib/couple-auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(COUPLE_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
