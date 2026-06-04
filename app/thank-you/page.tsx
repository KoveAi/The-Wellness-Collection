'use client'
import { useEffect } from 'react'
import TickerBanner from '@/app/components/TickerBanner'

export default function ThankYouPage() {
  useEffect(() => {
    ;(window as any).fbq?.('track', 'CompleteRegistration')
  }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      <style>{`
        /* ── Header ── */
        .ty-header {
          background: var(--cream);
          padding: 52px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-bottom: 1px solid var(--border-light);
        }
        .ty-header-brand {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          line-height: 1.2;
        }
        .ty-header-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-top: 5px;
        }

        /* ── Logo on white ── */
        .ty-logo-section {
          background: #fff;
          padding: 96px 40px 0;
          text-align: center;
        }
        .ty-oval-logo {
          height: 220px;
          width: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto -110px;
          position: relative;
          z-index: 2;
        }

        /* ── Text section — beige ── */
        .ty-text-section {
          background: var(--cream);
          padding-top: 140px;
          padding-bottom: 52px;
          padding-left: 40px;
          padding-right: 40px;
          text-align: center;
        }
        .ty-text-inner {
          max-width: 640px;
          margin: 0 auto;
        }
        .ty-h1 {
          font-family: var(--font-display);
          font-size: 50px;
          font-weight: 100;
          line-height: 1.1;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 0;
        }
        .ty-divider {
          width: 40px;
          height: 1px;
          background: var(--mid);
          margin: 16px auto;
        }

        /* ── White separator ── */
        .ty-white-sep {
          background: #fff;
          padding: 20px 0;
        }

        /* ── Confirmation — beige ── */
        .ty-confirm-section {
          background: var(--cream);
          padding: 36px 40px 64px;
          text-align: center;
        }
        .ty-confirm-inner {
          max-width: 560px;
          margin: 0 auto;
        }
        .ty-confirm-label {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: var(--mid);
          display: block;
          margin-bottom: 20px;
        }
        .ty-confirm-sub {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.75;
          margin: 0;
        }

        /* ── Ticker on white ── */
        .ty-ticker-section {
          background: #fff;
        }

        /* ── Blush footer ── */
        .ty-footer {
          background: var(--blush);
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .ty-footer-brand {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          margin-bottom: 6px;
        }
        .ty-footer-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 16px;
        }
        .ty-footer-copy {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .ty-header { padding: 40px 20px; }
          .ty-header-brand { font-size: 24px; }
          .ty-logo-section { padding: 40px 20px 0; }
          .ty-oval-logo { height: 160px !important; margin-bottom: -80px !important; }
          .ty-text-section { padding-top: 96px !important; padding-bottom: 40px !important; padding-left: 24px !important; padding-right: 24px !important; }
          .ty-h1 { font-size: 32px !important; }
          .ty-confirm-section { padding: 28px 24px 48px; }
          .ty-footer { padding: 28px 20px; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="ty-header">
        <span className="ty-header-brand">Gracefully Redefined</span>
        <span className="ty-header-sub">The Wellness Collection</span>
      </header>

      {/* ── Logo on white ── */}
      <div className="ty-logo-section">
        <img
          src="/twc-logo.svg"
          alt="Gracefully Redefined — The Wellness Collection"
          className="ty-oval-logo"
        />
      </div>

      {/* ── Text — beige ── */}
      <div className="ty-text-section">
        <div className="ty-text-inner">
          <h1 className="ty-h1">You&apos;re on the list.</h1>
          <div className="ty-divider" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 0 }}>
            We&apos;ll be in touch the moment we open our doors —<br />
            with something meaningful to begin the work.
          </p>
        </div>
      </div>

      {/* ── White separator ── */}
      <div className="ty-white-sep" />

      {/* ── Confirmation note — beige ── */}
      <div className="ty-confirm-section">
        <div className="ty-confirm-inner">
          <span className="ty-confirm-label">Gracefully Redefined</span>
          <div className="ty-divider" />
          <p className="ty-confirm-sub">
            Watch your inbox. We&apos;ll reach out when the doors open —<br />
            and with a little something to begin the journey before they do.
          </p>
        </div>
      </div>

      {/* ── Ticker on white ── */}
      <div className="ty-ticker-section">
        <TickerBanner />
      </div>

      {/* ── Blush footer ── */}
      <footer className="ty-footer">
        <span className="ty-footer-brand">Gracefully Redefined</span>
        <span className="ty-footer-sub">The Wellness Collection</span>
        <p className="ty-footer-copy">
          &copy; {new Date().getFullYear()} Gracefully Redefined &middot; The Wellness Collection. All rights reserved.
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
