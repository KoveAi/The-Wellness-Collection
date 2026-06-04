import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths always allowed through, even in Coming Soon mode
function isComingSoonAllowed(pathname: string): boolean {
  return (
    pathname.startsWith('/coming-soon') ||
    pathname.startsWith('/thank-you') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/contact') ||
    /\.(?:jpg|jpeg|png|gif|svg|ico|webp|woff2?|ttf|otf|css|js|map)$/i.test(pathname)
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // ── Coming Soon gate — only admins can access the platform ─────────────────
  if (process.env.COMING_SOON?.trim() === 'true') {
    const isAdmin = token?.role === 'ADMIN'
    if (!isComingSoonAllowed(pathname) && !isAdmin) {
      return NextResponse.redirect(new URL('/coming-soon', req.url))
    }
  }

  // ── Protected routes require authentication ───────────────────────────────
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/profile')

  if (isProtected && !token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // ── Admin routes require ADMIN role ───────────────────────────────────────
  if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.html).*)'],
}
