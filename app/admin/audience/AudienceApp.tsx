/**
 * WORKING STANDARDS
 * - No drifting from the task. No hallucinating or guessing — ask when unsure.
 * - Verify before reporting. Absolute excellence: elegance, luxury, class.
 * - Cormorant serif for all display type.
 * - Psychoeducational language only — no clinical/therapy terminology.
 *
 * Audience Catalog, mobile-first. Same sections and JSON format as the
 * desktop app in tools/audience-catalog. Styling uses the legacy CSS vars
 * from globals.css via inline styles; hover/focus live in the scoped
 * <style> block keyed on data-ac attributes (no custom class names, per
 * the CSS governance lint).
 */

'use client'
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudienceRecordDTO, ENTITIES, ENTITY_KEYS, EntityDef, EntityKey, FieldDef, todayIso,
} from '@/lib/audience'

type Section = 'overview' | EntityKey | 'data'
type View = { section: Section; editing: string | null } // editing: record id, 'new', or null
type Draft = {
  id: string | null
  name: string
  tags: string[]
  fields: Record<string, string | string[]>
  links: Record<string, string[]>
}

// ── Style tokens (all values from globals.css :root) ─────────────────────────
const serif = 'var(--font-display)'
const S: Record<string, CSSProperties> = {
  page: { background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--text)' },
  wrap: { maxWidth: 720, margin: '0 auto', padding: '24px 16px 120px' },
  eyebrow: {
    display: 'block', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
    color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500,
  },
  h1: { fontFamily: serif, fontSize: 36, fontWeight: 300, lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em' },
  h2: { fontFamily: serif, fontSize: 24, fontWeight: 300, margin: 0 },
  italic: { fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 15 },
  card: {
    background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.12em',
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {}, // base input styles live in SCOPED_CSS so :focus can override them
  btn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44,
    padding: '0 18px', borderRadius: 'var(--radius)', border: '1px solid var(--mid)', background: 'var(--blush)',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--blush)', borderRadius: 100,
    padding: '4px 4px 4px 12px', fontSize: 15, lineHeight: 1.3,
  },
  rule: { height: 1, background: 'var(--border)', border: 'none', margin: '16px 0' },
}
const btnDark: CSSProperties = { ...S.btn, background: 'var(--text)', color: 'var(--white)', borderColor: 'var(--text)' }
const btnOutline: CSSProperties = { ...S.btn, background: 'transparent' }
const btnDanger: CSSProperties = { ...S.btn, background: 'transparent', color: '#c25a4a', borderColor: 'var(--border)' }
const linkBtn: CSSProperties = {
  background: 'none', border: 'none', padding: '6px 0', font: 'inherit', fontSize: 16, color: 'var(--text)',
  textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', textAlign: 'left',
}

const SCOPED_CSS = `
  [data-ac="input"] {
    width: 100%; min-height: 46px; padding: 11px 14px; border: 1px solid var(--border);
    border-radius: var(--radius); font-family: var(--font-body);
    font-size: 16px; /* 16px stops iOS zoom on focus */
    background: var(--white); color: var(--text); outline: none; letter-spacing: 0.01em;
  }
  [data-ac="input"]:focus { border-color: var(--text); }
  [data-ac="row"] { background: var(--card); }
  [data-ac="tab"] { -webkit-tap-highlight-color: transparent; }
  [data-ac="tabs"]::-webkit-scrollbar { display: none; }
  [data-ac="row"]:active { background: var(--cream); }
  [data-ac="btn"]:disabled { opacity: 0.45; cursor: default; }
  [data-ac="stat"]:active { transform: scale(0.98); }
  @media (hover: hover) {
    [data-ac="row"]:hover { background: var(--cream); }
    [data-ac="btn"]:not(:disabled):hover { filter: brightness(0.96); }
  }
`

// ── Helpers ─────────────────────────────────────────────────────────────────
function emptyDraft(ent: EntityDef): Draft {
  const fields: Record<string, string | string[]> = {}
  const links: Record<string, string[]> = {}
  for (const f of ent.fields) {
    if (f.key === 'name' || f.key === 'tags') continue
    if (f.kind === 'link' || f.kind === 'ref') links[f.key] = []
    else if (f.kind === 'list') fields[f.key] = []
    else if (f.kind === 'date') fields[f.key] = todayIso()
    else fields[f.key] = ''
  }
  return { id: null, name: '', tags: [], fields, links }
}

function draftFrom(ent: EntityDef, r: AudienceRecordDTO): Draft {
  const base = emptyDraft(ent)
  return {
    id: r.id,
    name: r.name,
    tags: [...r.tags],
    fields: { ...base.fields, ...r.fields },
    links: { ...base.links, ...r.links },
  }
}

const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b)

function friendlyDate(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function readView(): View {
  if (typeof window === 'undefined') return { section: 'overview', editing: null }
  const p = new URLSearchParams(window.location.search)
  const s = p.get('s') ?? 'overview'
  const section: Section = s === 'data' || s === 'overview' || (ENTITY_KEYS as readonly string[]).includes(s)
    ? (s as Section) : 'overview'
  return { section, editing: section !== 'overview' && section !== 'data' ? p.get('e') : null }
}

function viewUrl(v: View) {
  const p = new URLSearchParams()
  if (v.section !== 'overview') p.set('s', v.section)
  if (v.editing) p.set('e', v.editing)
  const q = p.toString()
  return `${window.location.pathname}${q ? `?${q}` : ''}`
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function AudienceApp() {
  const [records, setRecords] = useState<AudienceRecordDTO[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ section: 'overview', editing: null })
  const dirtyRef = useRef(false)
  const [flash, setFlash] = useState<string | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const setDirty = useCallback((d: boolean) => { dirtyRef.current = d }, [])
  const clearFlash = useCallback(() => setFlash(null), [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audience', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load the catalog.')
      setRecords(data.records)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e.message ?? 'Could not load the catalog.')
    }
  }, [])

  useEffect(() => {
    setView(readView())
    load()
  }, [load])

  // Phone back button walks back through list / editor views.
  useEffect(() => {
    function onPop() {
      if (dirtyRef.current && !confirm('Discard unsaved changes?')) {
        window.history.pushState(null, '', viewUrl(viewRef.current))
        return
      }
      dirtyRef.current = false
      setView(readView())
    }
    function onUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  const go = useCallback((next: View, opts: { replace?: boolean; force?: boolean } = {}) => {
    if (!opts.force && dirtyRef.current && !confirm('Discard unsaved changes?')) return
    dirtyRef.current = false
    if (opts.replace) window.history.replaceState(null, '', viewUrl(next))
    else window.history.pushState(null, '', viewUrl(next))
    setView(next)
    window.scrollTo({ top: 0 })
  }, [])

  const byId = useMemo(() => new Map((records ?? []).map(r => [r.id, r])), [records])

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
      <div style={S.wrap}>
        {view.editing === null && (
          <>
            <span style={S.eyebrow}>Admin · Audience Catalog</span>
            <SectionTabs current={view.section} onPick={s => go({ section: s, editing: null })} />
          </>
        )}

        {loadError && (
          <div style={{ ...S.card, padding: 20, marginTop: 16 }} role="alert">
            <p style={{ margin: 0, fontSize: 17 }}>{loadError}</p>
            <button data-ac="btn" style={{ ...btnOutline, marginTop: 12 }} onClick={load}>Try again</button>
          </div>
        )}

        {!records && !loadError && <p style={{ ...S.italic, marginTop: 32 }}>Gathering the catalog…</p>}

        {records && view.section === 'overview' && (
          <Overview records={records} onOpen={(section, editing) => go({ section, editing })} />
        )}

        {records && view.section === 'data' && <DataPanel records={records} onImported={load} />}

        {records && view.section !== 'overview' && view.section !== 'data' && view.editing === null && (
          <SectionList
            ent={ENTITIES[view.section]}
            records={records.filter(r => r.kind === view.section)}
            onOpen={id => go({ section: view.section, editing: id })}
          />
        )}

        {records && view.section !== 'overview' && view.section !== 'data' && view.editing !== null && (
          <Editor
            key={`${view.section}:${view.editing}`}
            ent={ENTITIES[view.section]}
            record={view.editing === 'new' ? null : byId.get(view.editing) ?? null}
            missing={view.editing !== 'new' && !byId.has(view.editing)}
            records={records}
            onDirty={setDirty}
            flash={flash}
            onFlashShown={clearFlash}
            onBack={() => go({ section: view.section, editing: null })}
            onSaved={async (id, message) => {
              await load()
              setFlash(message)
              go({ section: view.section as EntityKey, editing: id }, { replace: true, force: true })
            }}
            onDeleted={async () => {
              await load()
              go({ section: view.section as EntityKey, editing: null }, { replace: true, force: true })
            }}
            onNavigate={(section, id) => go({ section, editing: id })}
          />
        )}
      </div>
    </div>
  )
}

// ── Section switcher ────────────────────────────────────────────────────────
function SectionTabs({ current, onPick }: { current: Section; onPick: (s: Section) => void }) {
  const items: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    ...ENTITY_KEYS.map(k => ({ key: k as Section, label: ENTITIES[k].short })),
    { key: 'data', label: 'Data' },
  ]
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [current])
  return (
    <nav
      data-ac="tabs"
      aria-label="Catalog sections"
      style={{
        display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '4px -16px 20px',
        padding: '4px 16px', WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map(it => {
        const active = it.key === current
        return (
          <button
            key={it.key}
            ref={active ? activeRef : undefined}
            data-ac="tab"
            aria-current={active ? 'page' : undefined}
            onClick={() => onPick(it.key)}
            style={{
              flexShrink: 0, minHeight: 40, padding: '0 16px', borderRadius: 100, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 16,
              border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
              background: active ? 'var(--text)' : 'var(--card)',
              color: active ? 'var(--white)' : 'var(--text)',
            }}
          >
            {it.label}
          </button>
        )
      })}
    </nav>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview({ records, onOpen }: {
  records: AudienceRecordDTO[]
  onOpen: (section: EntityKey, editing: string | null) => void
}) {
  const counts = Object.fromEntries(ENTITY_KEYS.map(k => [k, records.filter(r => r.kind === k).length]))
  const personas = records.filter(r => r.kind === 'personas')
  const linkedTo = (kind: EntityKey, field: string) =>
    new Set(records.filter(r => r.kind === kind).flatMap(r => r.links[field] ?? []))

  const clusterPersonas = linkedTo('interest_clusters', 'related_personas')
  const patternPersonas = linkedTo('engagement_patterns', 'persona_id')
  const pathwayPersonas = linkedTo('growth_pathways', 'linked_personas')
  const triggeredClusters = linkedTo('content_triggers', 'linked_clusters')
  type Gap = { title: string; kind: EntityKey; items: AudienceRecordDTO[] }
  const allGaps: Gap[] = [
    { title: 'Personas with no interest cluster', kind: 'personas', items: personas.filter(p => !clusterPersonas.has(p.id)) },
    { title: 'Personas with no engagement pattern', kind: 'personas', items: personas.filter(p => !patternPersonas.has(p.id)) },
    {
      title: 'Clusters no content trigger speaks to', kind: 'interest_clusters',
      items: records.filter(r => r.kind === 'interest_clusters' && !triggeredClusters.has(r.id)),
    },
    { title: 'Personas with no growth pathway', kind: 'personas', items: personas.filter(p => !pathwayPersonas.has(p.id)) },
  ]
  const gaps = allGaps.filter(g => g.items.length)

  const actions = records
    .filter(r => r.kind === 'insights')
    .sort((a, b) => String(b.fields.insight_date ?? '').localeCompare(String(a.fields.insight_date ?? '')))
    .flatMap(r => ((r.fields.action_items as string[]) ?? []).map(item => ({ item, r })))
    .slice(0, 8)

  return (
    <>
      <h1 style={S.h1}>Know who you are here for.</h1>
      <p style={{ ...S.italic, fontSize: 17, margin: '10px 0 24px' }}>
        Personas, the interests they carry, where they gather, and what we are learning.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {ENTITY_KEYS.map(k => (
          <button
            key={k}
            data-ac="stat"
            onClick={() => onOpen(k, null)}
            style={{ ...S.card, padding: '16px 16px 14px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          >
            <span style={{ ...S.eyebrow, fontSize: 10, letterSpacing: '0.2em', marginBottom: 2 }}>{ENTITIES[k].short}</span>
            <span style={{ display: 'block', fontFamily: serif, fontSize: 38, fontWeight: 300, lineHeight: 1.15, fontVariantNumeric: 'lining-nums' }}>
              {counts[k]}
            </span>
            <span style={{ ...S.italic, fontSize: 14 }}>{ENTITIES[k].eyebrow}</span>
          </button>
        ))}
      </div>

      <div style={{ ...S.card, padding: 20, marginTop: 20 }}>
        <span style={S.eyebrow}>Where the research is thin</span>
        <h2 style={S.h2}>Coverage gaps</h2>
        <hr style={S.rule} />
        {gaps.length === 0 && (
          <p style={{ ...S.italic, margin: 0 }}>
            {personas.length ? 'Every persona is mapped to an interest, a pattern, and a pathway.' : 'Add your first persona to begin.'}
          </p>
        )}
        {gaps.map(g => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 17, fontWeight: 500 }}>{g.title}</span>
              <span style={{
                background: 'var(--blush)', color: '#8a6a5a', borderRadius: 100, minWidth: 28, textAlign: 'center',
                padding: '1px 10px', fontSize: 14, fontVariantNumeric: 'lining-nums',
              }}>{g.items.length}</span>
            </div>
            {g.items.slice(0, 4).map(r => (
              <button key={r.id} style={{ ...linkBtn, display: 'block' }} onClick={() => onOpen(g.kind, r.id)}>{r.name}</button>
            ))}
            {g.items.length > 4 && <span style={{ ...S.italic, fontSize: 14 }}>and {g.items.length - 4} more</span>}
          </div>
        ))}
      </div>

      <div style={{ ...S.card, padding: 20, marginTop: 16 }}>
        <span style={S.eyebrow}>From recent insights</span>
        <h2 style={S.h2}>Action items</h2>
        <hr style={S.rule} />
        {actions.length === 0 && (
          <p style={{ ...S.italic, margin: 0 }}>Log an insight with action items and they will gather here.</p>
        )}
        {actions.map(({ item, r }, i) => (
          <div key={`${r.id}-${i}`} style={{ marginBottom: 8 }}>
            <button style={linkBtn} onClick={() => onOpen('insights', r.id)}>{item}</button>
            <div style={{ ...S.italic, fontSize: 13 }}>
              {friendlyDate(String(r.fields.insight_date ?? ''))} · {r.name}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── List ────────────────────────────────────────────────────────────────────
function SectionList({ ent, records, onOpen }: {
  ent: EntityDef; records: AudienceRecordDTO[]; onOpen: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const tags = useMemo(() => {
    const m = new Map<string, string>()
    records.forEach(r => r.tags.forEach(t => { if (!m.has(t.toLowerCase())) m.set(t.toLowerCase(), t) }))
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [records])

  const needle = q.trim().toLowerCase()
  const shown = records.filter(r => {
    if (tag && !r.tags.some(t => t.toLowerCase() === tag.toLowerCase())) return false
    if (!needle) return true
    const hay = [r.name, ...r.tags, ...Object.values(r.fields).flat()].join(' ').toLowerCase()
    return hay.includes(needle)
  })

  const summary = (r: AudienceRecordDTO) => {
    const first = ent.fields.find(f => f.kind === 'text' && r.fields[f.key])
    return first ? String(r.fields[first.key]) : ''
  }

  return (
    <>
      <span style={S.eyebrow}>{ent.eyebrow}</span>
      <h1 style={S.h1}>{ent.label}</h1>
      <p style={{ ...S.italic, margin: '6px 0 16px' }}>
        {shown.length !== records.length
          ? `${shown.length} of ${records.length} shown`
          : records.length === 0 ? 'Nothing here yet' : `${records.length} ${records.length === 1 ? 'entry' : 'entries'}`}
      </p>

      <button data-ac="btn" style={{ ...btnDark, width: '100%', marginBottom: 12 }} onClick={() => onOpen('new')}>
        New {ent.singular}
      </button>

      {records.length > 0 && (
        <input
          data-ac="input"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={`Search ${ent.label.toLowerCase()}`}
          aria-label={`Search ${ent.label.toLowerCase()}`}
          style={{ ...S.input, marginBottom: 10 }}
        />
      )}

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {['', ...tags].map(t => {
            const active = t === tag
            return (
              <button
                key={t || '__all'}
                onClick={() => setTag(t)}
                aria-pressed={active}
                style={{
                  minHeight: 34, padding: '0 12px', borderRadius: 100, cursor: 'pointer', fontSize: 15,
                  fontFamily: 'var(--font-body)', border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                  background: active ? 'var(--blush)' : 'transparent', color: 'var(--text)',
                }}
              >
                {t || 'All'}
              </button>
            )
          })}
        </div>
      )}

      {shown.length > 0 && (
        <div style={{ ...S.card, overflow: 'hidden' }}>
          {shown.map((r, i) => (
            <button
              key={r.id}
              data-ac="row"
              onClick={() => onOpen(r.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
                border: 'none', borderTop: i ? '1px solid var(--border-light)' : 'none', cursor: 'pointer',
                font: 'inherit', color: 'inherit',
              }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.25 }}>{r.name}</span>
                <span aria-hidden style={{ color: 'var(--mid)', fontSize: 20 }}>›</span>
              </span>
              {summary(r) && (
                <span style={{
                  ...S.italic, fontSize: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', marginTop: 2,
                }}>{summary(r)}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {records.length > 0 && shown.length === 0 && <p style={S.italic}>No matches. Try a different word or tag.</p>}
    </>
  )
}

// ── Editor ──────────────────────────────────────────────────────────────────
function Editor({
  ent, record, missing, records, onDirty, flash, onFlashShown, onBack, onSaved, onDeleted, onNavigate,
}: {
  ent: EntityDef
  record: AudienceRecordDTO | null
  missing: boolean
  records: AudienceRecordDTO[]
  onDirty: (dirty: boolean) => void
  flash: string | null
  onFlashShown: () => void
  onBack: () => void
  onSaved: (id: string, message: string) => Promise<void>
  onDeleted: () => Promise<void>
  onNavigate: (section: EntityKey, id: string) => void
}) {
  const initial = useMemo(() => (record ? draftFrom(ent, record) : emptyDraft(ent)), [ent, record])
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState<null | 'save' | 'delete' | 'dup'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dirty = !same(draft, initial)

  // After a save the catalog reloads and `record` changes; take the saved
  // version as the new baseline so the form is clean again.
  useEffect(() => { setDraft(initial) }, [initial])
  useEffect(() => {
    if (!flash) return
    setNotice(flash)
    onFlashShown()
  }, [flash, onFlashShown])
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => () => onDirty(false), [onDirty])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(t)
  }, [notice])

  const backlinks = useMemo(() => {
    if (!record) return []
    return records.filter(r => Object.values(r.links).some(ids => ids.includes(record.id)))
  }, [records, record])

  if (missing) {
    return (
      <>
        <BackLink label={ent.label} onClick={onBack} />
        <p style={{ fontSize: 18, marginTop: 24 }}>This entry no longer exists.</p>
      </>
    )
  }

  const setField = (key: string, value: string | string[]) =>
    setDraft(d => ({ ...d, fields: { ...d.fields, [key]: value } }))
  const setLinks = (key: string, value: string[]) =>
    setDraft(d => ({ ...d, links: { ...d.links, [key]: value } }))

  async function send(body: Draft, id: string | null) {
    const res = await fetch(id ? `/api/admin/audience/${id}` : '/api/admin/audience', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: ent.key, name: body.name, tags: body.tags, fields: body.fields, links: body.links }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Could not save.')
    return data.record as AudienceRecordDTO
  }

  async function save() {
    if (!draft.name.trim()) { setError('Name is required'); return }
    setBusy('save'); setError(null)
    try {
      const saved = await send(draft, draft.id)
      onDirty(false)
      await onSaved(saved.id, 'Saved')
    } catch (e: any) {
      setError(e.message ?? 'Network error. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function duplicate() {
    if (dirty && !confirm('Discard unsaved changes and duplicate the saved version?')) return
    setBusy('dup'); setError(null)
    try {
      const copy = await send({ ...initial, id: null, name: `${initial.name} (copy)` }, null)
      onDirty(false)
      await onSaved(copy.id, 'Copied. You are editing the copy.')
    } catch (e: any) {
      setError(e.message ?? 'Could not duplicate.')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!record) return
    const owned = ent.key === 'personas'
      ? backlinks.filter(b => b.kind === 'engagement_patterns' && b.links.persona_id?.includes(record.id)).length : 0
    let msg = `Delete “${record.name}”? This cannot be undone.`
    if (backlinks.length) msg += `\n\nIt is linked from ${backlinks.length} other entr${backlinks.length === 1 ? 'y' : 'ies'}; those links will be removed.`
    if (owned) msg += ` ${owned} engagement pattern${owned === 1 ? '' : 's'} for this persona will be deleted too.`
    if (!confirm(msg)) return
    setBusy('delete'); setError(null)
    try {
      const res = await fetch(`/api/admin/audience/${record.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not delete.')
      onDirty(false)
      await onDeleted()
    } catch (e: any) {
      setError(e.message ?? 'Could not delete.')
      setBusy(null)
    }
  }

  return (
    <>
      <BackLink label={ent.label} onClick={onBack} />
      <span style={{ ...S.eyebrow, marginTop: 18 }}>{ent.singular}</span>
      <h1 style={{ ...S.h1, fontSize: 32, overflowWrap: 'anywhere' }}>{draft.name.trim() || `New ${ent.singular}`}</h1>
      <p style={{ ...S.italic, fontSize: 14, margin: '6px 0 0' }}>
        {record ? `Updated ${friendlyDate(record.updatedAt)}` : 'Not saved yet'}
      </p>
      <hr style={S.rule} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {ent.fields.map(f => (
          <FieldInput
            key={f.key}
            f={f}
            draft={draft}
            records={records}
            selfId={record?.id ?? null}
            onName={v => setDraft(d => ({ ...d, name: v }))}
            onTags={v => setDraft(d => ({ ...d, tags: v }))}
            onField={setField}
            onLinks={setLinks}
          />
        ))}
      </div>

      {backlinks.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <span style={S.label}>Referenced by</span>
          {backlinks.map(b => (
            <button key={b.id} style={{ ...linkBtn, display: 'block' }} onClick={() => onNavigate(b.kind, b.id)}>
              {ENTITIES[b.kind].singular} · {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Fixed action bar; bottom padding clears the iPhone home indicator. */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: 'var(--cream)',
        borderTop: '1px solid var(--border)', padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ maxWidth: 688, margin: '0 auto' }}>
          <div aria-live="polite" style={{
            minHeight: 20, fontSize: 14, fontStyle: 'italic', marginBottom: 6,
            color: error ? '#c25a4a' : notice ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {error ?? notice ?? (dirty ? 'Unsaved changes' : '')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {record && (
              <button data-ac="btn" style={btnDanger} disabled={!!busy} onClick={remove} aria-label="Delete">
                {busy === 'delete' ? '…' : 'Delete'}
              </button>
            )}
            {record && (
              <button data-ac="btn" style={btnOutline} disabled={!!busy} onClick={duplicate}>
                {busy === 'dup' ? '…' : 'Copy'}
              </button>
            )}
            <button data-ac="btn" style={{ ...btnDark, flex: 1 }} disabled={!!busy || (!dirty && !!record)} onClick={save}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ ...linkBtn, textDecoration: 'none', color: 'var(--text-muted)', minHeight: 44, fontSize: 16 }}
    >
      ‹ {label}
    </button>
  )
}

// ── Field inputs ────────────────────────────────────────────────────────────
function FieldInput({ f, draft, records, selfId, onName, onTags, onField, onLinks }: {
  f: FieldDef
  draft: Draft
  records: AudienceRecordDTO[]
  selfId: string | null
  onName: (v: string) => void
  onTags: (v: string[]) => void
  onField: (k: string, v: string | string[]) => void
  onLinks: (k: string, v: string[]) => void
}) {
  const id = `ac-${f.key}`
  const label = <label htmlFor={id} style={S.label}>{f.label}{f.key === 'name' ? ' *' : ''}</label>

  if (f.key === 'name') {
    return <div>{label}<input id={id} data-ac="input" style={S.input} value={draft.name} maxLength={200}
      onChange={e => onName(e.target.value)} autoComplete="off" /></div>
  }
  if (f.key === 'tags') {
    return <div>{label}<ChipInput id={id} values={draft.tags} onChange={onTags} hint={f.hint} /></div>
  }
  const value = draft.fields[f.key]
  switch (f.kind) {
    case 'line':
      return <div>{label}<input id={id} data-ac="input" style={S.input} value={String(value ?? '')}
        placeholder={f.hint} onChange={e => onField(f.key, e.target.value)} /></div>
    case 'text':
      return <div>{label}<textarea id={id} data-ac="input" rows={4} value={String(value ?? '')} placeholder={f.hint}
        onChange={e => onField(f.key, e.target.value)}
        style={{ ...S.input, minHeight: 110, resize: 'vertical', lineHeight: 1.45 }} /></div>
    case 'list':
      return <div>{label}<ChipInput id={id} values={(value as string[]) ?? []} hint={f.hint}
        onChange={v => onField(f.key, v)} /></div>
    case 'choice':
      return <div>{label}
        <input id={id} data-ac="input" list={`${id}-list`} style={S.input} value={String(value ?? '')}
          onChange={e => onField(f.key, e.target.value)} placeholder="Choose or type" />
        <datalist id={`${id}-list`}>{f.choices?.map(c => <option key={c} value={c} />)}</datalist>
      </div>
    case 'date':
      return <div>{label}<input id={id} data-ac="input" type="date" style={S.input} value={String(value ?? '')}
        onChange={e => onField(f.key, e.target.value)} /></div>
    case 'ref': {
      const options = records.filter(r => r.kind === f.target)
      const current = draft.links[f.key]?.[0] ?? ''
      return <div>{label}
        <select id={id} data-ac="input" style={{ ...S.input, appearance: 'auto' }} value={current}
          onChange={e => onLinks(f.key, e.target.value ? [e.target.value] : [])}>
          <option value="">None</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
    }
    case 'link': {
      const options = records.filter(r => r.kind === f.target && r.id !== selfId)
      return <div>{label}<LinkPicker id={id} options={options} selected={draft.links[f.key] ?? []}
        onChange={v => onLinks(f.key, v)} targetLabel={ENTITIES[f.target!].label.toLowerCase()} /></div>
    }
  }
}

function ChipInput({ id, values, onChange, hint }: {
  id: string; values: string[]; onChange: (v: string[]) => void; hint?: string
}) {
  const [text, setText] = useState('')
  function commit(raw = text) {
    const parts = raw.split(/[,\n]/).map(p => p.trim()).filter(Boolean)
    if (!parts.length) { setText(''); return }
    const lower = new Set(values.map(v => v.toLowerCase()))
    const next = [...values]
    for (const p of parts) if (!lower.has(p.toLowerCase())) { next.push(p); lower.add(p.toLowerCase()) }
    onChange(next)
    setText('')
  }
  return (
    <div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map(v => (
            <span key={v} style={S.chip}>
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter(x => x !== v))}
                style={{
                  border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
                  width: 28, height: 28, borderRadius: 100, cursor: 'pointer',
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={id}
          data-ac="input"
          style={S.input}
          value={text}
          enterKeyHint="done"
          placeholder={hint ?? 'Type, then Add'}
          onChange={e => (/[,\n]/.test(e.target.value) ? commit(e.target.value) : setText(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
          onBlur={() => commit()} // a half-typed item is not lost when tapping Save
        />
        <button type="button" data-ac="btn" style={{ ...btnOutline, flexShrink: 0 }} disabled={!text.trim()}
          onMouseDown={e => e.preventDefault()} onClick={() => commit()}>
          Add
        </button>
      </div>
    </div>
  )
}

function LinkPicker({ id, options, selected, onChange, targetLabel }: {
  id: string; options: AudienceRecordDTO[]; selected: string[]; onChange: (v: string[]) => void; targetLabel: string
}) {
  const [q, setQ] = useState('')
  if (!options.length) return <p id={id} style={{ ...S.italic, margin: 0 }}>No {targetLabel} yet. Add some first.</p>
  const chosen = new Set(selected)
  const needle = q.trim().toLowerCase()
  const shown = options.filter(o => !needle || o.name.toLowerCase().includes(needle))
  const toggle = (oid: string) => onChange(chosen.has(oid) ? selected.filter(x => x !== oid) : [...selected, oid])
  return (
    <div id={id}>
      {options.length > 6 && (
        <input data-ac="input" type="search" style={{ ...S.input, marginBottom: 8 }} value={q}
          onChange={e => setQ(e.target.value)} placeholder="Filter" aria-label={`Filter ${targetLabel}`} />
      )}
      <div style={{ ...S.card, boxShadow: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {shown.map((o, i) => {
          const on = chosen.has(o.id)
          return (
            <label
              key={o.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '8px 14px', cursor: 'pointer',
                borderTop: i ? '1px solid var(--border-light)' : 'none', background: on ? 'var(--blush)' : 'var(--card)',
                // Undo the global `label` rule in globals.css (11px uppercase caption style).
                fontSize: 17, fontWeight: 400, textTransform: 'none', letterSpacing: '0.01em',
                color: 'var(--text)', marginBottom: 0,
              }}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(o.id)}
                style={{ width: 20, height: 20, accentColor: 'var(--text)', flexShrink: 0 }} />
              {o.name}
            </label>
          )
        })}
      </div>
      <p style={{ ...S.italic, fontSize: 13, margin: '6px 0 0' }}>
        {selected.length ? `${selected.length} linked` : 'None linked'}
      </p>
    </div>
  )
}

// ── Data (export / import) ──────────────────────────────────────────────────
function DataPanel({ records, onImported }: { records: AudienceRecordDTO[]; onImported: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const modeRef = useRef<'merge' | 'replace'>('merge')

  function pick(mode: 'merge' | 'replace') {
    if (mode === 'replace' && !confirm(
      `Replace all ${records.length} entries with the file's contents? Export a copy first if you may want them back.`,
    )) return
    modeRef.current = mode
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const res = await fetch(`/api/admin/audience/transfer?mode=${modeRef.current}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await file.text(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Import failed.')
      const parts = Object.entries(data.counts as Record<string, number>)
        .filter(([, n]) => n).map(([k, n]) => `${n} ${ENTITIES[k as EntityKey].label.toLowerCase()}`)
      setMessage(parts.length ? `Imported ${parts.join(', ')}.` : 'The file had no entries.')
      await onImported()
    } catch (err: any) {
      setError(`Nothing was imported. ${err.message ?? ''}`.trim())
    } finally {
      setBusy(false)
    }
  }

  const section = (title: string, body: string, children?: React.ReactNode) => (
    <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
      <h2 style={S.h2}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.5, margin: '8px 0 0' }}>{body}</p>
      {children && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>{children}</div>}
    </div>
  )

  return (
    <>
      <span style={S.eyebrow}>Settings</span>
      <h1 style={S.h1}>Your data</h1>
      <p style={{ ...S.italic, fontSize: 17, margin: '8px 0 20px' }}>
        Stored in the site database, visible to admins only.
      </p>
      {section('Export', 'Downloads every entry and link as JSON. The desktop Audience Catalog app can import this file.',
        <a data-ac="btn" href="/api/admin/audience/transfer" style={{ ...S.btn, textDecoration: 'none' }}>Export JSON</a>)}
      {section('Import', 'Load a JSON export from the desktop app or this page. Merge keeps what is here; Replace clears it first. A bad file changes nothing.',
        <>
          <button data-ac="btn" style={S.btn} disabled={busy} onClick={() => pick('merge')}>Import and merge</button>
          <button data-ac="btn" style={btnDanger} disabled={busy} onClick={() => pick('replace')}>Import and replace</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} hidden />
        </>)}
      {(message || error || busy) && (
        <p aria-live="polite" style={{ fontStyle: 'italic', margin: '0 0 14px', color: error ? '#c25a4a' : 'var(--success)' }}>
          {busy ? 'Importing…' : error ?? message}
        </p>
      )}
      {section('Privacy', 'Personas are composites, not people. Keep real names, private handles, emails, and screenshots of private messages out of this catalog.')}
    </>
  )
}
