'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const AGENTS = [
  { name: 'Jennifer', avatar: '/avatars/Jennifer.png' },
  { name: 'Max',      avatar: '/avatars/Max.png'      },
  { name: 'Joseph',   avatar: '/avatars/Joseph.png'   },
  { name: 'Gabby',    avatar: '/avatars/Gabby.png'    },
  { name: 'Lisa',     avatar: '/avatars/Lisa.png'     },
  { name: 'Rachel',   avatar: '/avatars/Rachel.png'   },
]

export default function FloatingHelp() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [agentIndex, setAgentIndex] = useState(0)
  const [avatarError, setAvatarError] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => { setAgentIndex(Math.floor(Math.random() * AGENTS.length)) }, [])
  const agent = AGENTS[agentIndex]

  // Start countdown when panel opens
  useEffect(() => {
    if (open) { setTransitioning(true); setCountdown(10) }
  }, [open])

  // Tick countdown
  useEffect(() => {
    if (!transitioning) return
    if (countdown <= 0) { setTransitioning(false); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [transitioning, countdown])

  const rotateAgent = () => {
    setAgentIndex(prev => (prev + 1) % AGENTS.length)
    setAvatarError(false)
    setTransitioning(false)
  }

  useEffect(() => {
    if (open && !transitioning) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, transitioning])

  useEffect(() => {
    if (open && !transitioning) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, transitioning])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/faq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, agentName: agent.name, conversationHistory: messages }),
      })
      const data = await res.json()
      setMessages([...next, { role: 'assistant', content: data.reply || 'Unable to respond. Please try again.' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (pathname === '/coming-soon' || pathname === '/landing') return null
  // Audience Catalog has its own fixed action bar where this button would sit.
  if (pathname.startsWith('/admin/audience')) return null

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .faq-panel { animation: fadeUp 0.2s ease forwards; }
      `}</style>

      {/* Panel */}
      {open && (
        <div className="faq-panel" style={{
          position: 'fixed', bottom: '88px', left: '28px', zIndex: 1000,
          width: '360px', background: '#fff', borderRadius: '16px',
          border: '1px solid var(--border)', boxShadow: '0 12px 48px rgba(0,0,0,0.14)',
          overflow: 'hidden', fontFamily: 'var(--font-body)',
          display: 'flex', flexDirection: 'column', maxHeight: '520px',
        }}>

          {/* Header */}
          <div style={{
            background: 'var(--header)', padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0,
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {!avatarError && (
                <img src={agent.avatar} alt={agent.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--mid)', display: 'block' }}
                  onError={() => setAvatarError(true)}
                />
              )}
              <span style={{
                position: 'absolute', bottom: '1px', right: '1px',
                width: '11px', height: '11px', borderRadius: '50%',
                background: transitioning ? '#f0a500' : '#5cb85c', border: '2px solid #fff',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 500, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                {agent.name}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', letterSpacing: '0.04em' }}>
                {transitioning ? 'Connecting…' : 'Wellness Support Team · Online'}
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); setMessages([]); rotateAgent() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1, padding: '4px', flexShrink: 0 }}
              aria-label="Close"
            >×</button>
          </div>

          {/* Countdown screen */}
          {transitioning && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px', textAlign: 'center', background: 'var(--cream)' }}>
              {!avatarError && (
                <img src={agent.avatar} alt={agent.name}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '3px solid var(--mid)' }}
                  onError={() => setAvatarError(true)}
                />
              )}
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Your agent will be with you in
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 300, color: 'var(--text)', margin: 0, lineHeight: 1 }}>
                  {countdown}
                </p>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
                {agent.name} is on their way…
              </p>
            </div>
          )}

          {/* Chat interface */}
          {!transitioning && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: '12px 12px 12px 2px', padding: '11px 14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.65 }}>
                      Hi! I'm {agent.name} from The Wellness Collection support team. Ask me anything about our courses, enrollment, or how the platform works.
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    background: msg.role === 'user' ? 'var(--blush)' : 'var(--cream)',
                    border: '1px solid var(--border-light)',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '10px 14px',
                  }}>
                    <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.65 }}>{msg.content}</p>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: '12px 12px 12px 2px', padding: '10px 14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{agent.name} is typing…</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '12px 16px 14px', borderTop: '1px solid var(--border-light)', flexShrink: 0, background: '#fff' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder={`Ask ${agent.name} anything…`}
                    disabled={loading}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', background: 'var(--white)', color: 'var(--text)', outline: 'none', minWidth: 0 }}
                  />
                  <button onClick={send} disabled={loading || !input.trim()}
                    style={{ background: 'var(--blush)', border: '1px solid var(--mid)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.05em', color: 'var(--text)', cursor: loading || !input.trim() ? 'default' : 'pointer', opacity: loading || !input.trim() ? 0.45 : 1, flexShrink: 0 }}
                  >Send</button>
                </div>
              </div>

              <div style={{ padding: '10px 20px 14px', background: 'var(--header)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <a href="mailto:support@gracefullyredefined.com" style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                  Still have questions? Email us →
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { if (open) { setOpen(false); setMessages([]); rotateAgent() } else { setOpen(true) } }}
        aria-label={open ? 'Close help' : 'Chat with support'}
        style={{
          position: 'fixed', bottom: '28px', left: '28px', zIndex: 1000,
          height: '44px', borderRadius: '22px',
          background: 'var(--header)', border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          cursor: 'pointer', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text)', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1 }}>✦</span>
        Support
      </button>
    </>
  )
}
