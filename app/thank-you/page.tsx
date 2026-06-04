'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function ThankYouPage() {
  useEffect(() => {
    ;(window as any).fbq?.('track', 'CompleteRegistration')
  }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .ty-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          padding: 80px 24px;
          text-align: center;
        }
        .ty-logo {
          height: 120px;
          width: auto;
          object-fit: contain;
          margin-bottom: 48px;
          display: block;
        }
        .ty-label {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 20px;
        }
        .ty-divider {
          width: 40px;
          height: 1px;
          background: var(--mid);
          margin: 0 auto 32px;
        }
        .ty-h1 {
          font-family: var(--font-display);
          font-size: 52px;
          font-weight: 100;
          line-height: 1.1;
          color: var(--text);
          letter-spacing: -0.01em;
          margin: 0 0 20px;
        }
        .ty-sub {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.8;
          max-width: 480px;
          margin: 0 auto 48px;
        }
        .ty-divider-bottom {
          width: 40px;
          height: 1px;
          background: var(--mid);
          margin: 0 auto 36px;
        }
        .ty-btn {
          display: inline-block;
          padding: 15px 52px;
          background: transparent;
          color: var(--text);
          border: 1px solid var(--text);
          border-radius: var(--radius);
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          transition: background 0.22s ease, transform 0.22s ease;
        }
        .ty-btn:hover {
          background: var(--blush);
          transform: translateY(-2px);
        }
        .ty-footer {
          background: var(--blush);
          padding: 32px 24px;
          text-align: center;
        }
        .ty-footer-brand {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          margin-bottom: 4px;
        }
        .ty-footer-sub {
          font-family: var(--font-body);
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 14px;
        }
        .ty-footer-copy {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          opacity: 0.6;
        }

        @media (max-width: 640px) {
          .ty-wrap { padding: 64px 24px; }
          .ty-logo { height: 90px; margin-bottom: 36px; }
          .ty-h1 { font-size: 34px; }
          .ty-sub { font-size: 16px; }
          .ty-btn { padding: 14px 40px; width: 100%; max-width: 280px; box-sizing: border-box; text-align: center; }
        }
      `}</style>

      <main className="ty-wrap">
        <img
          src="/twc-logo.svg"
          alt="Gracefully Redefined — The Wellness Collection"
          className="ty-logo"
        />

        <span className="ty-label">Gracefully Redefined</span>
        <div className="ty-divider" />

        <h1 className="ty-h1">You&apos;re on the list.</h1>

        <p className="ty-sub">
          We&apos;ll be in touch the moment we open our doors —
          with something meaningful to begin the work.
        </p>

        <div className="ty-divider-bottom" />

        <Link href="/coming-soon" className="ty-btn">
          Return Home
        </Link>
      </main>

      <footer className="ty-footer">
        <span className="ty-footer-brand">Gracefully Redefined</span>
        <span className="ty-footer-sub">The Wellness Collection</span>
        <p className="ty-footer-copy">
          &copy; {new Date().getFullYear()} Gracefully Redefined &middot; The Wellness Collection. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
