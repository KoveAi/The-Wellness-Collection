'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TickerBanner from '@/app/components/TickerBanner'

export default function LandingPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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
        ;(window as any).fbq?.('track', 'Lead')
        router.push('/thank-you')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('lp-revealed')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.lp-reveal, .lp-reveal-left').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      <style>{`
        /* ── Scroll reveal ── */
        .lp-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.75s ease, transform 0.75s ease;
        }
        .lp-reveal.lp-revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-reveal-left {
          opacity: 0;
          transform: translateX(-32px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        .lp-reveal-left.lp-revealed {
          opacity: 1;
          transform: translateX(0);
        }
        .lp-d1 { transition-delay: 0.1s; }
        .lp-d2 { transition-delay: 0.2s; }
        .lp-d3 { transition-delay: 0.3s; }
        .lp-d4 { transition-delay: 0.4s; }
        .lp-d5 { transition-delay: 0.5s; }
        .lp-d6 { transition-delay: 0.65s; }
        .lp-d7 { transition-delay: 0.8s; }


        /* ── Logo bridge ── */
        .lp-logo-section {
          background: #fff;
          padding: 80px 40px 0;
          text-align: center;
        }
        .lp-oval-logo {
          height: 220px;
          width: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto -110px;
          position: relative;
          z-index: 2;
        }

        /* ── Hero text ── */
        .lp-hero-section {
          background: var(--cream);
          padding: 148px 40px 80px;
          text-align: center;
        }
        .lp-hero-inner { max-width: 1000px; margin: 0 auto; }

        .lp-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 22px;
        }
        .lp-h1 {
          font-family: var(--font-display);
          font-size: 72px;
          font-weight: 100;
          line-height: 1.08;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 0;
        }
        .lp-divider {
          width: 40px;
          height: 1px;
          background: var(--mid);
          margin: 20px auto;
        }
        .lp-hero-sub {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.75;
          margin-bottom: 40px;
        }
        .lp-btn-primary {
          display: inline-block;
          padding: 16px 60px;
          background: var(--blush);
          color: var(--text);
          border: 1px solid var(--mid);
          border-radius: var(--radius);
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.22s ease, transform 0.22s ease;
        }
        .lp-btn-primary:hover {
          background: var(--mid);
          transform: translateY(-2px);
        }
        .lp-btn-outline {
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
          cursor: pointer;
          text-decoration: none;
          transition: background 0.22s ease, transform 0.22s ease;
        }
        .lp-btn-outline:hover {
          background: var(--blush);
          transform: translateY(-2px);
        }

        /* ── Ticker ── */
        .lp-ticker-section { background: #fff; }

        /* ── About ── */
        .lp-about-section {
          background: var(--cream);
          padding: 96px 40px;
          text-align: center;
        }
        .lp-about-inner { max-width: 680px; margin: 0 auto; }

        .lp-section-label {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 20px;
        }
        .lp-h2 {
          font-family: var(--font-display);
          font-size: 44px;
          font-weight: 100;
          line-height: 1.15;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 24px;
        }
        .lp-body-text {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.85;
        }

        /* ── Pillars ── */
        .lp-pillars-section {
          background: #fff;
          padding: 96px 40px;
        }
        .lp-pillars-inner { max-width: 1000px; margin: 0 auto; }
        .lp-pillars-header { text-align: center; margin-bottom: 72px; }
        .lp-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 56px;
        }
        .lp-pillar { text-align: center; }
        .lp-pillar-number {
          font-family: var(--font-display);
          font-size: 52px;
          font-weight: 100;
          color: var(--mid);
          display: block;
          line-height: 1;
          margin-bottom: 16px;
          letter-spacing: 0.04em;
        }
        .lp-pillar-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 300;
          color: var(--text);
          margin-bottom: 14px;
          display: block;
        }
        .lp-pillar-text {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.75;
        }

        /* ── Modules ── */
        .lp-modules-section {
          background: var(--cream);
          padding: 96px 40px;
        }
        .lp-modules-inner { max-width: 800px; margin: 0 auto; text-align: center; }
        .lp-modules-list { margin-top: 56px; }
        .lp-module-item {
          display: flex;
          align-items: flex-start;
          gap: 32px;
          padding: 32px 0;
          border-top: 1px solid var(--border-light);
          text-align: left;
        }
        .lp-module-item:last-child { border-bottom: 1px solid var(--border-light); }
        .lp-module-num {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 300;
          color: var(--mid);
          min-width: 28px;
          padding-top: 3px;
          letter-spacing: 0.06em;
        }
        .lp-module-title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 300;
          color: var(--text);
          margin-bottom: 8px;
          display: block;
        }
        .lp-module-desc {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.7;
          margin: 0;
        }

        /* ── Testimonials ── */
        .lp-testimonials-section {
          background: var(--blush);
          padding: 96px 40px;
        }
        .lp-testimonials-inner { max-width: 1040px; margin: 0 auto; }
        .lp-testimonials-header { text-align: center; margin-bottom: 72px; }
        .lp-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .lp-testimonial {
          background: #fff;
          padding: 40px 36px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
        }
        .lp-testimonial-mark {
          font-family: var(--font-display);
          font-size: 60px;
          font-weight: 100;
          color: var(--mid);
          line-height: 0.65;
          display: block;
          margin-bottom: 20px;
        }
        .lp-testimonial-text {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 300;
          font-style: italic;
          color: var(--text);
          line-height: 1.8;
          flex: 1;
          margin-bottom: 32px;
        }
        .lp-testimonial-divider {
          width: 28px;
          height: 1px;
          background: var(--mid);
          margin-bottom: 18px;
        }
        .lp-testimonial-name {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
        }
        .lp-testimonial-location {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          opacity: 0.55;
          display: block;
          margin-top: 5px;
        }

        /* ── Meet the Creator ── */
        .lp-creator-section {
          background: #fff;
          padding: 96px 40px;
        }
        .lp-creator-inner {
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 72px;
          align-items: center;
        }
        .lp-creator-photo-wrap {
          position: relative;
        }
        .lp-creator-photo {
          width: 100%;
          aspect-ratio: 3 / 4;
          object-fit: cover;
          object-position: top center;
          border-radius: var(--radius-md);
          display: block;
          filter: grayscale(8%);
        }
        .lp-creator-photo-frame {
          position: absolute;
          inset: -10px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          pointer-events: none;
          z-index: 0;
        }
        .lp-creator-text { }
        .lp-creator-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 18px;
        }
        .lp-creator-name {
          font-family: var(--font-display);
          font-size: 42px;
          font-weight: 300;
          color: var(--text);
          letter-spacing: -0.01em;
          line-height: 1.1;
          margin-bottom: 6px;
          display: block;
        }
        .lp-creator-title {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 28px;
        }
        .lp-creator-quote {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 300;
          font-style: italic;
          color: var(--text);
          line-height: 1.85;
          margin-bottom: 28px;
        }
        .lp-creator-body {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 300;
          font-style: italic;
          color: var(--text-muted);
          line-height: 1.85;
        }

        /* ── Final CTA ── */
        .lp-cta-section {
          background: var(--cream);
          padding: 104px 40px;
          text-align: center;
        }
        .lp-cta-inner { max-width: 600px; margin: 0 auto; }
        .lp-cta-h2 {
          font-family: var(--font-display);
          font-size: 52px;
          font-weight: 100;
          line-height: 1.1;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 0;
        }

        /* ── Disclaimer ── */
        .lp-disclaimer {
          background: var(--cream);
          padding: 40px 40px 0;
          text-align: center;
        }
        .lp-disclaimer-inner {
          max-width: 680px;
          margin: 0 auto;
          padding: 32px 0;
          border-top: 1px solid var(--border-light);
        }
        .lp-disclaimer-label {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--text-muted);
          opacity: 0.6;
          display: block;
          margin-bottom: 12px;
        }
        .lp-disclaimer-text {
          font-family: var(--font-body);
          font-size: 12px;
          line-height: 1.85;
          color: var(--text-muted);
          opacity: 0.65;
          letter-spacing: 0.01em;
          margin: 0;
        }

        /* ── Footer ── */
        .lp-footer {
          background: var(--blush);
          padding: 56px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .lp-footer-logo {
          height: 56px;
          width: auto;
          object-fit: contain;
          opacity: 0.55;
          margin-bottom: 28px;
        }
        .lp-footer-brand {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          margin-bottom: 6px;
        }
        .lp-footer-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-bottom: 28px;
        }
        .lp-footer-links {
          display: flex;
          gap: 32px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .lp-footer-link {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .lp-footer-link:hover { opacity: 1; }
        .lp-footer-copy {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          opacity: 0.6;
        }

        /* ── Header ── */
        .lp-header {
          background: var(--cream);
          padding: 52px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 1px solid var(--border-light);
        }
        .lp-header-brand {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text);
          display: block;
          line-height: 1.2;
        }
        .lp-header-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
          margin-top: 5px;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .lp-header { padding: 40px 20px; }
          .lp-header-brand { font-size: 24px; }

          .lp-logo-section { padding: 48px 20px 0; }
          .lp-oval-logo { height: 160px !important; margin-bottom: -80px !important; }

          .lp-hero-section { padding: 106px 24px 64px !important; }
          .lp-h1 { font-size: 42px !important; }
          .lp-hero-sub { font-size: 17px !important; }

          .lp-creator-inner { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-creator-name { font-size: 32px !important; }
          .lp-creator-photo { aspect-ratio: 4 / 5 !important; object-position: top center !important; }

          .lp-about-section, .lp-pillars-section, .lp-modules-section,
          .lp-testimonials-section, .lp-creator-section, .lp-cta-section {
            padding: 64px 24px !important;
          }
          .lp-h2 { font-size: 30px !important; }
          .lp-cta-h2 { font-size: 32px !important; }

          .lp-pillars-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-testimonials-grid { grid-template-columns: 1fr !important; }

          .lp-module-item { flex-direction: column; gap: 6px; }
          .lp-module-title { font-size: 20px !important; }

          .lp-disclaimer { padding: 32px 24px 0; }
          .lp-footer { padding: 44px 24px; }
          .lp-footer-links { gap: 18px; }
        }

        @media (min-width: 641px) and (max-width: 960px) {
          .lp-h1 { font-size: 46px !important; }
          .lp-pillars-grid { grid-template-columns: 1fr 1fr !important; }
          .lp-testimonials-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="lp-header">
        <span className="lp-header-brand">Gracefully Redefined</span>
        <span className="lp-header-sub">The Wellness Collection</span>
      </header>

      {/* ── Logo bridge: white → cream ── */}
      <div className="lp-logo-section">
        <img
          src="/twc-logo.svg"
          alt="Gracefully Redefined — The Wellness Collection"
          className="lp-oval-logo lp-reveal"
        />
      </div>

      {/* ── Hero ── */}
      <section className="lp-hero-section">
        <div className="lp-hero-inner">
          <p className="lp-eyebrow lp-reveal">A Psychoeducational Platform</p>
          <h1 className="lp-h1 lp-reveal lp-d1">
            Understand yourself.<br />Transform your relationships.
          </h1>
          <div className="lp-divider lp-reveal lp-d2" />
          <p className="lp-hero-sub lp-reveal lp-d2">
            Licensed Mental Health Therapist-created psychoeducation on attachment,<br />
            the ways you&apos;ve learned to protect yourself,<br />
            and who you are becoming in your relationships.
          </p>
          <a href="/coming-soon" className="lp-btn-primary lp-reveal lp-d3">
            Begin Your Journey
          </a>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="lp-ticker-section">
        <TickerBanner bg="#fff" />
      </div>

      {/* ── About ── */}
      <section className="lp-about-section">
        <div className="lp-about-inner">
          <span className="lp-section-label lp-reveal">The Work</span>
          <h2 className="lp-h2 lp-reveal">
            Knowledge that changes<br />the way you see yourself.
          </h2>
          <div className="lp-divider lp-reveal" />
          <p className="lp-body-text lp-reveal">
            The Wellness Collection is a carefully curated psychoeducational platform
            designed to bring accessible, meaningful insight into the patterns that shape
            your relationships — and into who you are choosing to become. Created by
            a Licensed Mental Health Therapist. Designed for you.
          </p>
        </div>
      </section>

      {/* ── Three Pillars ── */}
      <section className="lp-pillars-section">
        <div className="lp-pillars-inner">
          <div className="lp-pillars-header">
            <span className="lp-section-label lp-reveal">What You Will Explore</span>
            <h2 className="lp-h2 lp-reveal">Three areas of profound growth.</h2>
            <div className="lp-divider lp-reveal" />
          </div>
          <div className="lp-pillars-grid">
            <div className="lp-pillar lp-reveal">
              <span className="lp-pillar-number">I.</span>
              <div className="lp-divider" style={{ margin: '0 auto 18px' }} />
              <span className="lp-pillar-title">Understanding Attachment</span>
              <p className="lp-pillar-text">
                Learn the foundations of how you connect — and why. Gain a clear,
                compassionate framework for the patterns that run beneath your relationships.
              </p>
            </div>
            <div className="lp-pillar lp-reveal lp-d1">
              <span className="lp-pillar-number">II.</span>
              <div className="lp-divider" style={{ margin: '0 auto 18px' }} />
              <span className="lp-pillar-title">Recognizing Your Patterns</span>
              <p className="lp-pillar-text">
                Discover the ways you&apos;ve learned to protect yourself — and how those
                patterns serve you, and where they hold you back from the connection you want.
              </p>
            </div>
            <div className="lp-pillar lp-reveal lp-d2">
              <span className="lp-pillar-number">III.</span>
              <div className="lp-divider" style={{ margin: '0 auto 18px' }} />
              <span className="lp-pillar-title">Becoming in Relationship</span>
              <p className="lp-pillar-text">
                Step into who you are growing into. Develop new language, new awareness,
                and a clearer vision of what you want your relationships to look like.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What&apos;s Inside ── */}
      <section className="lp-modules-section">
        <div className="lp-modules-inner">
          <span className="lp-section-label lp-reveal">The Collection</span>
          <h2 className="lp-h2 lp-reveal">Thoughtfully designed.<br />Deeply meaningful.</h2>
          <div className="lp-divider lp-reveal" />
          <p className="lp-body-text lp-reveal">
            Each module guides you through one layer of the work — at your own pace,
            in your own time, with the depth and care it deserves.
          </p>
          <div className="lp-modules-list">
            {([
              {
                n: '01',
                title: 'Foundations of Attachment',
                desc: 'An introduction to the psychoeducation that underpins the entire collection. Understand the research, the framework, and what this work asks of you.',
              },
              {
                n: '02',
                title: 'The Anxious Connection',
                desc: 'A compassionate exploration of anxious attachment — its roots, its presentation, and the relational world it creates around us.',
              },
              {
                n: '03',
                title: 'The Avoidant Architecture',
                desc: 'Understand how avoidant patterns develop, how they protect, and the cost they quietly carry in moments of real connection.',
              },
              {
                n: '04',
                title: 'The Disorganized Experience',
                desc: 'A thoughtful examination of disorganized attachment — and the extraordinary resilience that so often accompanies it.',
              },
              {
                n: '05',
                title: 'Secure Becoming',
                desc: 'The possibility of change. This module explores what it looks like to move toward security — and the daily choices that make it real.',
              },
            ] as { n: string; title: string; desc: string }[]).map((mod) => (
              <div className="lp-module-item lp-reveal" key={mod.n}>
                <span className="lp-module-num">{mod.n}</span>
                <div>
                  <span className="lp-module-title">{mod.title}</span>
                  <p className="lp-module-desc">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="lp-testimonials-section">
        <div className="lp-testimonials-inner">
          <div className="lp-testimonials-header">
            <span className="lp-section-label lp-reveal">From Those Who Have Done the Work</span>
            <h2 className="lp-h2 lp-reveal">Words we are honored to carry.</h2>
            <div className="lp-divider lp-reveal" />
          </div>
          <div className="lp-testimonials-grid">
            {([
              {
                quote: 'I finally had language for what I had been experiencing my entire adult life. The clarity this work gave me changed the way I show up in every relationship I care about.',
                name: 'Sarah M.',
                location: 'New York, NY',
              },
              {
                quote: 'I came in curious and left with a completely different relationship with myself. What struck me most was how clearly the material was presented — without judgment, without overwhelm.',
                name: 'Rachel T.',
                location: 'Los Angeles, CA',
              },
              {
                quote: 'I have recommended this to everyone in my life who wants to understand themselves better. The depth, the care, the way it holds you through the work — there is nothing else like it.',
                name: 'James L.',
                location: 'Atlanta, GA',
              },
            ] as { quote: string; name: string; location: string }[]).map((t, i) => (
              <div
                className="lp-testimonial lp-reveal"
                style={{ transitionDelay: `${i * 0.13}s` }}
                key={t.name}
              >
                <span className="lp-testimonial-mark">&ldquo;</span>
                <p className="lp-testimonial-text">{t.quote}</p>
                <div className="lp-testimonial-divider" />
                <span className="lp-testimonial-name">{t.name}</span>
                <span className="lp-testimonial-location">{t.location}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet the Creator ── */}
      <section className="lp-creator-section">
        <div className="lp-creator-inner">

          {/* Photo */}
          <div className="lp-creator-photo-wrap lp-reveal-left">
            <div className="lp-creator-photo-frame" />
            <img
              src="/michelle-chasen.jpeg"
              alt="Michelle R. Chasen"
              className="lp-creator-photo"
            />
          </div>

          {/* Text */}
          <div className="lp-creator-text">
            <span className="lp-creator-eyebrow lp-reveal lp-d2">Meet the Creator</span>
            <span className="lp-creator-name lp-reveal lp-d3">Michelle R. Chasen, <span style={{ fontSize: '0.88em', letterSpacing: '0.06em' }}>LCMHCA</span></span>
            <span className="lp-creator-title lp-reveal lp-d4">Licensed Clinical Mental Health Therapist</span>
            <div className="lp-divider lp-reveal lp-d4" style={{ margin: '0 0 28px' }} />
            <p className="lp-creator-quote lp-reveal lp-d5">
              &ldquo;I built The Wellness Collection because I believe every person deserves
              the kind of self-understanding that changes the way they move through the world —
              and through the relationships that matter most to them.&rdquo;
            </p>
            <p className="lp-creator-body lp-reveal lp-d6">
              I have spent years sitting with people who were carrying patterns they had never
              been given language for. This collection is my way of putting that language
              in your hands — at your pace, in your time, with the depth it deserves.
            </p>
            <div className="lp-divider lp-reveal lp-d7" style={{ margin: '28px 0 0' }} />
          </div>

        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-inner">
          <span className="lp-section-label lp-reveal">The Invitation</span>
          <h2 className="lp-cta-h2 lp-reveal">
            The work begins<br />when you do.
          </h2>
          <div className="lp-divider lp-reveal" />
          <p className="lp-body-text lp-reveal" style={{ marginBottom: '44px' }}>
            Join the waitlist and be among the first to access The Wellness Collection
            when we open our doors. Be the first to know — and the first to begin.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
              <input
                type="text"
                placeholder="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                style={{ padding: '14px 16px', fontSize: '14px', border: '1px solid var(--border-light)', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--text)' }}
              />
              <input
                type="text"
                placeholder="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                style={{ padding: '14px 16px', fontSize: '14px', border: '1px solid var(--border-light)', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--text)' }}
              />
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ padding: '14px 16px', fontSize: '14px', border: '1px solid var(--border-light)', fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--text)' }}
              />
              {status === 'error' && (
                <p style={{ color: '#c84644', fontSize: '13px', margin: 0 }}>Something went wrong. Please try again.</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="lp-btn-outline"
                style={{ opacity: status === 'loading' ? 0.6 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}
              >
                {status === 'loading' ? 'Joining…' : 'Join the Waitlist'}
              </button>
            </form>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <div className="lp-disclaimer">
        <div className="lp-disclaimer-inner">
          <span className="lp-disclaimer-label">Disclaimer</span>
          <p className="lp-disclaimer-text">
            This resource is for psychoeducational and informational purposes only and is not a substitute for
            psychotherapy, counseling, diagnosis, or medical advice. Purchasing this resource does not establish
            a therapeutic relationship. If you are in crisis or need mental health support, please contact a
            licensed provider or emergency services in your area.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <img
          src="/GR-LOGO-OVAL.svg"
          alt="Gracefully Redefined"
          className="lp-footer-logo"
        />
        <span className="lp-footer-brand">Gracefully Redefined</span>
        <span className="lp-footer-sub">The Wellness Collection</span>
        <nav className="lp-footer-links">
          <a href="/coming-soon" className="lp-footer-link">Waitlist</a>
          <a href="/coming-soon" className="lp-footer-link">About</a>
          <a href="/coming-soon" className="lp-footer-link">Contact</a>
        </nav>
        <p className="lp-footer-copy">
          &copy; {new Date().getFullYear()} Gracefully Redefined &middot; The Wellness Collection. All rights reserved.
        </p>
        <a
          href="/login"
          style={{ display: 'block', marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', opacity: 0.25 }}
        >
          &ndash;
        </a>
      </footer>

    </div>
  )
}
