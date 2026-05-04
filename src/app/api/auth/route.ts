import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json()
  const correct = process.env.DASHBOARD_PASSWORD ?? '1234'

  if (password !== correct) {
    return Response.json({ ok: false }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('auth', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  })

  return Response.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('auth')
  return Response.json({ ok: true })
}
