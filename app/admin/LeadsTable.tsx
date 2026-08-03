'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Lead = { id: string; name: string; email: string; createdAt: Date }

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [list, setList] = useState(leads)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [blocking, setBlocking] = useState<string | null>(null)

  async function handleBlock(lead: Lead) {
    if (!confirm(`Block ${lead.email}? They'll be removed from the waitlist and can't sign up again.`)) return
    setBlocking(lead.id)
    try {
      const res = await fetch('/api/admin/blocked-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: lead.email, note: `Blocked from waitlist — ${lead.name}` }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error ?? 'Failed to block address.')
        return
      }
      setList(prev => prev.filter(l => l.id !== lead.id))
      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setBlocking(null)
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`Remove ${lead.name} (${lead.email}) from the waitlist?`)) return
    setDeleting(lead.id)
    try {
      const res = await fetch(`/api/admin/leads?id=${lead.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error ?? 'Failed to delete lead.')
        return
      }
      setList(prev => prev.filter(l => l.id !== lead.id))
      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
            {['Name', 'Email', 'Signed Up', ''].map(h => (
              <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>No leads yet.</td></tr>
          ) : (
            list.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 500 }}>{lead.name}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{lead.email}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => handleBlock(lead)}
                    disabled={blocking === lead.id}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      marginRight: '8px',
                      cursor: blocking === lead.id ? 'not-allowed' : 'pointer',
                      opacity: blocking === lead.id ? 0.5 : 1,
                    }}
                  >
                    {blocking === lead.id ? 'Blocking…' : 'Block'}
                  </button>
                  <button
                    onClick={() => handleDelete(lead)}
                    disabled={deleting === lead.id}
                    style={{
                      background: 'none',
                      border: '1px solid #e57373',
                      color: '#e57373',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      cursor: deleting === lead.id ? 'not-allowed' : 'pointer',
                      opacity: deleting === lead.id ? 0.5 : 1,
                    }}
                  >
                    {deleting === lead.id ? 'Removing…' : 'Remove'}
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
