/**
 * WORKING STANDARDS
 * - No drifting from the task. No hallucinating or guessing — ask when unsure.
 * - Verify before reporting. Absolute excellence: elegance, luxury, class.
 * - Cormorant serif for all display type.
 * - Psychoeducational language only — no clinical/therapy terminology.
 */

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BlockedEmail = { id: string; value: string; note: string | null; createdAt: Date }

export default function BlockedEmailsTable({ entries }: { entries: BlockedEmail[] }) {
  const router = useRouter()
  const [list, setList] = useState(entries)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || saving) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/blocked-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value.trim(), note: note.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add entry.')
        return
      }
      setList(prev => [data.entry, ...prev.filter(x => x.id !== data.entry.id)])
      setValue('')
      setNote('')
      setMessage(
        data.removedLeads > 0
          ? `Blocked. ${data.removedLeads} matching ${data.removedLeads === 1 ? 'lead' : 'leads'} removed from the waitlist.`
          : 'Blocked.'
      )
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(entry: BlockedEmail) {
    if (!confirm(`Stop blocking ${entry.value}?`)) return
    setRemoving(entry.id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/blocked-emails?id=${entry.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to remove entry.')
        return
      }
      setList(prev => prev.filter(x => x.id !== entry.id))
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
    background: '#fff',
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
        }}
      >
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="name@example.com or @example.com"
          aria-label="Email address or domain to block"
          style={{ ...inputStyle, flex: '1 1 260px' }}
        />
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          style={{ ...inputStyle, flex: '1 1 180px' }}
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          style={{
            background: 'var(--text)',
            border: '1px solid var(--text)',
            color: '#fff',
            borderRadius: '6px',
            padding: '10px 22px',
            fontSize: '13px',
            letterSpacing: '0.04em',
            cursor: saving || !value.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !value.trim() ? 0.5 : 1,
          }}
        >
          {saving ? 'Blocking…' : 'Block'}
        </button>
      </form>

      {(message || error) && (
        <p
          style={{
            margin: 0,
            padding: '12px 20px',
            fontSize: '13px',
            color: error ? '#c62828' : 'var(--success, #2e7d32)',
            background: '#f8f9fa',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {error ?? message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
            {['Blocked', 'Scope', 'Note', 'Added', ''].map(h => (
              <th
                key={h}
                style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}
              >
                Nothing blocked yet.
              </td>
            </tr>
          ) : (
            list.map(entry => (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 500 }}>{entry.value}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {entry.value.startsWith('@') ? 'Entire domain' : 'Single address'}
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {entry.note || '—'}
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleRemove(entry)}
                    disabled={removing === entry.id}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      cursor: removing === entry.id ? 'not-allowed' : 'pointer',
                      opacity: removing === entry.id ? 0.5 : 1,
                    }}
                  >
                    {removing === entry.id ? 'Removing…' : 'Unblock'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
