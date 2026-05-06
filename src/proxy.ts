import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // /api/auth はログイン処理そのものなので素通り
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const auth = request.cookies.get('auth')
  const isAuthenticated = auth?.value === 'authenticated'
  if (isAuthenticated) return NextResponse.next()

  // 未認証: API は 401、画面は / にリダイレクト
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/', request.url))
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
