'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/app/LanguageContext'
import { t } from '@/lib/translations'

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const { lang } = useLanguage()

  const T = t[lang].nav
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const menuItems = [
    { label: T.home, href: '/' },
    { label: T.about, href: '/about' },
    { label: T.courses, href: '/courses' },
    { label: T.resources, href: '/resources' },
    { label: T.workbooks, href: '/workbooks' },
    { label: T.disclaimers, href: '/disclaimers' },
    { label: T.contact, href: '/contact' },
  ]

  if (pathname === '/coming-soon' || pathname === '/landing' || pathname === '/thank-you') return null
  if (pathname.startsWith('/learn/')) return null

  return (
    <nav style={{ background: 'var(--bg)', padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-light)' }}>
      <style>{`
        @media (max-width: 640px) {
          .nav-logo { display: none !important; }
          .nav-title-desktop { display: none !important; }
          .nav-mobile-header { display: flex !important; }
          nav { padding: 12px 16px !important; }
          .nav-mobile-header { position: absolute !important; left: 50% !important; transform: translateX(-50%) !important; }
          .nav-dropdown { left: 0 !important; right: 0 !important; width: 100vw !important; border-radius: 0 !important; position: fixed !important; top: 60px !important; max-height: 80vh !important; overflow-y: auto !important; }
        }
        @media (min-width: 641px) {
          .nav-mobile-header { display: none !important; }
        }
      `}</style>
      <Link href="/" className="nav-logo">
        <img src="/twc-logo.svg" alt="Logo" style={{ height: '56px', width: '56px', objectFit: 'contain' }} />
      </Link>
      {/* Desktop title */}
      <Link href="/" className="nav-title-desktop" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', textDecoration: 'none' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '44px', fontWeight: 400, color: 'var(--text)', margin: 0, letterSpacing: '0.02em', lineHeight: 1.15 }}>
          Gracefully Redefined
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          {t[lang].home.tagline}
        </p>
      </Link>
      {/* Mobile title — truly centered using a spacer div on the left matching button width */}
      <Link href="/" className="nav-mobile-header" style={{ flex: 1, flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--text)', margin: 0, letterSpacing: '0.04em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          Gracefully Redefined
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', margin: '3px 0 0', letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          The Wellness Collection
        </p>
      </Link>
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0, visibility: pathname === '/coming-soon' ? 'hidden' : 'visible' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ cursor: 'pointer', padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)', background: 'transparent' }}
        >
          ☰ Menu
        </button>
        {open && (
          <div className="nav-dropdown" style={{ position: 'absolute', right: 0, top: '52px', background: 'var(--cream)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', minWidth: '220px', overflow: 'hidden', zIndex: 999 }}>
            {menuItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-light)', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                {item.label}
              </Link>
            ))}


            {session && (
              <Link href="/dashboard" onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-light)', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                My Dashboard
              </Link>
            )}
            {session && (
              <Link href="/profile" onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-light)', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                My Profile
              </Link>
            )}
            {(session?.user as any)?.role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--gold)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-light)', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                Admin Panel
              </Link>
            )}
            {(session?.user as any)?.role === 'ADMIN' && (
              <Link href="/checklist" onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--gold)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-light)', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                Checklist
              </Link>
            )}
            {session ? (
              <button
                onClick={() => { setOpen(false); handleLogout() }}
                style={{ display: 'block', width: '100%', textAlign: lang === 'he' ? 'right' : 'left', padding: '14px 24px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--border)', direction: lang === 'he' ? 'rtl' : 'ltr' }}
              >
                {T.logout}
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} style={{ display: 'block', padding: '14px 24px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', direction: lang === 'he' ? 'rtl' : 'ltr' }}>
                {T.login}
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
