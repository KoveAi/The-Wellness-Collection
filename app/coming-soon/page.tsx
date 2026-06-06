'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TickerBanner from '@/app/components/TickerBanner'

export default function ComingSoonPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/leads/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim() }),
      })
      if (res.ok) {
        router.push('/thank-you')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      <style>{`
        /* ── Header ── */
        .cs-header {
          background: var(--cream);
          padding: 52px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-bottom: 1px solid var(--border-light);
        }
        .cs-header-brand {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          line-height: 1.2;
        }
        .cs-header-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-top: 5px;
        }

        /* ── Logo on white — thin, logo bridges into beige below ── */
        .cs-logo-section {
          background: #fff;
          padding: 96px 40px 0;
          text-align: center;
        }
        .cs-oval-logo {
          height: 220px;
          width: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto -110px;
          position: relative;
          z-index: 2;
        }

        /* ── Major text — beige ── */
        .cs-text-section {
          background: var(--cream);
          padding-top: 140px;
          padding-bottom: 52px;
          padding-left: 40px;
          padding-right: 40px;
          text-align: center;
        }
        .cs-text-inner {
          max-width: 640px;
          margin: 0 auto;
        }
        .cs-h1 {
          font-family: var(--font-display);
          font-size: 50px;
          font-weight: 100;
          line-height: 1.1;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 0;
          white-space: nowrap;
        }
        .cs-divider {
          width: 40px;
          height: 1px;
          background: var(--mid);
          margin: 16px auto;
        }

        /* ── Thin white separator ── */
        .cs-white-sep {
          background: #fff;
          padding: 20px 0;
        }

        /* ── Form — beige ── */
        .cs-form-section {
          background: var(--cream);
          padding: 36px 40px 40px;
          text-align: center;
        }
        .cs-form-inner {
          max-width: 700px;
          margin: 0 auto;
        }
        .cs-form-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .cs-input {
          padding: 10px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--text);
          background: #fff;
          outline: none;
          width: 160px;
        }
        .cs-input-email { width: 220px; }
        .cs-btn-notify {
          padding: 10px 28px;
          background: transparent;
          border: 1px solid var(--text);
          border-radius: var(--radius);
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text);
          cursor: pointer;
        }
        .cs-btn-notify:disabled { cursor: default; opacity: 0.6; }

        /* ── Ticker on white ── */
        .cs-ticker-section {
          background: #fff;
        }

        /* ── Blush footer ── */
        .cs-footer {
          background: var(--blush);
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .cs-footer-brand {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          margin-bottom: 6px;
        }
        .cs-footer-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 16px;
        }
        .cs-footer-copy {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .cs-header { padding: 40px 20px; }
          .cs-header-brand { font-size: 24px; }
          .cs-logo-section { padding: 40px 20px 0; }
          .cs-oval-logo { height: 160px !important; margin-bottom: -80px !important; }
          .cs-text-section { padding-top: 96px !important; padding-bottom: 40px !important; padding-left: 24px !important; padding-right: 24px !important; }
          .cs-h1 { font-size: 26px !important; white-space: normal !important; }
          .cs-form-section { padding: 28px 20px 32px; }
          .cs-form-row { flex-direction: column !important; align-items: center !important; }
          .cs-input, .cs-input-email, .cs-btn-notify {
            width: 100% !important;
            max-width: 320px !important;
            box-sizing: border-box !important;
          }
          .cs-footer { padding: 28px 20px; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="cs-header">
        <span className="cs-header-brand">Gracefully Redefined</span>
        <span className="cs-header-sub">The Wellness Collection</span>
      </header>

      {/* ── Logo on white ── */}
      <div className="cs-logo-section">
        <img
          src="/twc-logo.svg"
          alt="Gracefully Redefined — The Wellness Collection"
          className="cs-oval-logo"
        />
      </div>

      {/* ── Major text — beige ── */}
      <div className="cs-text-section">
        <div className="cs-text-inner">
          <h1 className="cs-h1">Something beautiful is coming.</h1>
          <div className="cs-divider" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '0' }}>
            Therapist-created psychoeducation on attachment,<br />
            the ways you&apos;ve learned to protect yourself,<br />
            and who you are becoming in your relationships.
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.65, marginTop: '10px', marginBottom: '0' }}>
            Be the first to know when the doors open — and receive an introduction to the work as we prepare to begin.
          </p>
        </div>
      </div>

      {/* ── Thin white separator ── */}
      <div className="cs-white-sep" />

      {/* ── Email capture — beige ── */}
      <div className="cs-form-section">
        <div className="cs-form-inner">
          <form onSubmit={handleSubmit}>
              <div className="cs-form-row">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="cs-input"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="cs-input"
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="cs-input cs-input-email"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="cs-btn-notify"
                >
                  {status === 'loading' ? 'Saving…' : 'Join the waitlist'}
                </button>
              </div>
              {status === 'error' && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Something went wrong — please try again.
                </p>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '6px' }}>
                You&apos;ll receive meaningful emails. Never noise. Unsubscribe anytime.
              </p>
            </form>
        </div>
      </div>

      {/* ── Ticker on white ── */}
      <div className="cs-ticker-section">
        <TickerBanner />
      </div>

      {/* ── Blush footer ── */}
      <footer className="cs-footer">
        <span className="cs-footer-brand">Gracefully Redefined</span>
        <span className="cs-footer-sub">The Wellness Collection</span>
        <p className="cs-footer-copy">
          © {new Date().getFullYear()} Gracefully Redefined · The Wellness Collection. All rights reserved.
        </p>
        <a
          href="/login"
          style={{ display: 'block', marginTop: '14px', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', opacity: 0.3 }}
        >
          –
        </a>
      </footer>

    </div>
  )
}
