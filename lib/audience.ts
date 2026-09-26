/**
 * AUDIENCE CATALOG — shared definitions (client + server)
 * ========================================================
 * Mirrors tools/audience-catalog/audience_catalog/entities.py so the
 * desktop app and this admin page read and write the same JSON export
 * format ("twc-audience-catalog" v1). Keys are the desktop's snake_case
 * field names; keep the two files in step.
 *
 * Storage (prisma/schema.prisma):
 *   AudienceRecord  one row per entry; `kind` is an entity key below,
 *                   `fields` holds every value except name/tags/links.
 *   AudienceLink    (fromId, field, toId) for LINK and REF fields.
 */

export type FieldKind = 'line' | 'text' | 'list' | 'choice' | 'date' | 'ref' | 'link'

export type FieldDef = {
  key: string
  label: string
  kind: FieldKind
  hint?: string
  choices?: string[]
  target?: EntityKey // ref / link only
}

export type EntityDef = {
  key: EntityKey
  label: string
  singular: string
  short: string // compact label for the section switcher
  eyebrow: string
  fields: FieldDef[]
}

export const ENTITY_KEYS = [
  'personas',
  'interest_clusters',
  'community_maps',
  'content_triggers',
  'growth_pathways',
  'engagement_patterns',
  'insights',
] as const
export type EntityKey = (typeof ENTITY_KEYS)[number]

export const PLATFORMS = [
  'Instagram', 'TikTok', 'YouTube', 'Pinterest', 'Facebook',
  'Threads', 'Substack', 'Podcast', 'Email', 'Other',
]

const NAME: FieldDef = { key: 'name', label: 'Name', kind: 'line' }
const TAGS: FieldDef = { key: 'tags', label: 'Tags', kind: 'list', hint: 'e.g. priority, launch' }

// Declared in dependency order: every ref/link target appears earlier.
export const ENTITIES: Record<EntityKey, EntityDef> = {
  personas: {
    key: 'personas', label: 'Personas', singular: 'Persona', short: 'Personas', eyebrow: 'Who we serve',
    fields: [
      NAME,
      { key: 'description', label: 'Description', kind: 'text', hint: 'Who this person is, in two or three sentences' },
      { key: 'age_range', label: 'Age range', kind: 'line', hint: 'e.g. 35 to 50' },
      { key: 'location', label: 'Location', kind: 'line', hint: 'Region or setting, never a real address' },
      { key: 'motivations', label: 'Motivations', kind: 'list' },
      { key: 'pain_points', label: 'Pain points', kind: 'list' },
      { key: 'aesthetic_preferences', label: 'Aesthetic preferences', kind: 'list' },
      { key: 'content_habits', label: 'Content habits', kind: 'text' },
      { key: 'follow_triggers', label: 'Why they follow', kind: 'list' },
      { key: 'unfollow_triggers', label: 'Why they leave', kind: 'list' },
      TAGS,
    ],
  },
  interest_clusters: {
    key: 'interest_clusters', label: 'Interest Clusters', singular: 'Interest Cluster', short: 'Clusters',
    eyebrow: 'What they care about',
    fields: [
      NAME,
      { key: 'description', label: 'Description', kind: 'text' },
      { key: 'subtopics', label: 'Subtopics', kind: 'list' },
      { key: 'related_personas', label: 'Related personas', kind: 'link', target: 'personas' },
      { key: 'example_content_ideas', label: 'Example content ideas', kind: 'list' },
      TAGS,
    ],
  },
  community_maps: {
    key: 'community_maps', label: 'Community Maps', singular: 'Community Map', short: 'Communities',
    eyebrow: 'Where they gather',
    fields: [
      NAME,
      { key: 'platform', label: 'Platform', kind: 'choice', choices: PLATFORMS },
      { key: 'hashtags', label: 'Hashtags', kind: 'list' },
      { key: 'accounts', label: 'Accounts', kind: 'list', hint: 'Public creator or brand handles only' },
      { key: 'community_groups', label: 'Groups', kind: 'list' },
      { key: 'personas', label: 'Personas found here', kind: 'link', target: 'personas' },
      { key: 'audience_overlap', label: 'Audience overlap', kind: 'text' },
      { key: 'notes', label: 'Notes', kind: 'text' },
      TAGS,
    ],
  },
  content_triggers: {
    key: 'content_triggers', label: 'Content Triggers', singular: 'Content Trigger', short: 'Triggers',
    eyebrow: 'What moves them',
    fields: [
      NAME,
      { key: 'description', label: 'Description', kind: 'text' },
      { key: 'examples', label: 'Examples', kind: 'list' },
      { key: 'best_formats', label: 'Best formats', kind: 'list', hint: 'e.g. carousel, reel, long read' },
      { key: 'linked_clusters', label: 'Linked clusters', kind: 'link', target: 'interest_clusters' },
      TAGS,
    ],
  },
  growth_pathways: {
    key: 'growth_pathways', label: 'Growth Pathways', singular: 'Growth Pathway', short: 'Pathways',
    eyebrow: 'How they find us',
    fields: [
      NAME,
      { key: 'description', label: 'Description', kind: 'text' },
      { key: 'mechanism', label: 'Mechanism', kind: 'text', hint: 'Why this pathway works' },
      { key: 'entry_points', label: 'Entry points', kind: 'list' },
      { key: 'linked_personas', label: 'Linked personas', kind: 'link', target: 'personas' },
      { key: 'linked_triggers', label: 'Linked triggers', kind: 'link', target: 'content_triggers' },
      TAGS,
    ],
  },
  engagement_patterns: {
    key: 'engagement_patterns', label: 'Engagement Patterns', singular: 'Engagement Pattern', short: 'Patterns',
    eyebrow: 'When they listen',
    fields: [
      NAME,
      { key: 'persona_id', label: 'Persona', kind: 'ref', target: 'personas' },
      { key: 'platform', label: 'Platform', kind: 'choice', choices: PLATFORMS },
      { key: 'active_times', label: 'Active times', kind: 'list', hint: 'e.g. weekday 6 to 7am' },
      { key: 'preferred_formats', label: 'Preferred formats', kind: 'list' },
      { key: 'high_topics', label: 'Topics that land', kind: 'list' },
      { key: 'low_topics', label: 'Topics that fall flat', kind: 'list' },
      { key: 'notes', label: 'Notes', kind: 'text' },
      TAGS,
    ],
  },
  insights: {
    key: 'insights', label: 'Insights', singular: 'Insight', short: 'Insights', eyebrow: 'What we are learning',
    fields: [
      NAME,
      { key: 'insight_date', label: 'Date', kind: 'date' },
      { key: 'source', label: 'Source', kind: 'line', hint: 'e.g. survey, DM themes, post analytics' },
      { key: 'summary', label: 'Summary', kind: 'text' },
      { key: 'linked_personas', label: 'Linked personas', kind: 'link', target: 'personas' },
      { key: 'linked_clusters', label: 'Linked clusters', kind: 'link', target: 'interest_clusters' },
      { key: 'action_items', label: 'Action items', kind: 'list' },
      TAGS,
    ],
  },
}

export function isEntityKey(value: unknown): value is EntityKey {
  return typeof value === 'string' && (ENTITY_KEYS as readonly string[]).includes(value)
}

/** Fields stored in the `fields` JSON column (not name, tags, or links). */
export function valueFields(ent: EntityDef): FieldDef[] {
  return ent.fields.filter(f => f.key !== 'name' && f.key !== 'tags' && f.kind !== 'link' && f.kind !== 'ref')
}

/** Fields stored as AudienceLink rows (links and the single ref). */
export function linkFields(ent: EntityDef): FieldDef[] {
  return ent.fields.filter(f => f.kind === 'link' || f.kind === 'ref')
}

// ── Wire shape ──────────────────────────────────────────────────────────────
export type AudienceRecordDTO = {
  id: string
  kind: EntityKey
  name: string
  tags: string[]
  fields: Record<string, string | string[]>
  links: Record<string, string[]> // ref fields hold 0 or 1 id
  createdAt: string
  updatedAt: string
}

export type AudienceInput = {
  name?: unknown
  tags?: unknown
  fields?: Record<string, unknown>
  links?: Record<string, unknown>
}

export type CleanInput = {
  name: string
  tags: string[]
  fields: Record<string, string | string[]>
  links: Record<string, string[]>
}

export class AudienceValidationError extends Error {}

// Generous caps: enough for real notes, small enough that one bad paste
// or a hostile request cannot bloat the database.
export const LIMITS = { name: 200, line: 500, text: 10_000, listItem: 300, listLength: 100, links: 500 }

function cleanList(label: string, raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === '') return []
  const items = typeof raw === 'string' ? [raw] : raw
  if (!Array.isArray(items)) throw new AudienceValidationError(`${label}: expected a list`)
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const text = String(item ?? '').trim()
    if (!text) continue
    if (text.length > LIMITS.listItem) throw new AudienceValidationError(`${label}: an item is too long`)
    const k = text.toLocaleLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(text)
  }
  if (out.length > LIMITS.listLength) throw new AudienceValidationError(`${label}: too many items`)
  return out
}

function cleanText(label: string, raw: unknown, max: number): string {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new AudienceValidationError(`${label}: expected text`)
  const text = String(raw).trim()
  if (text.length > max) throw new AudienceValidationError(`${label}: too long (max ${max} characters)`)
  return text
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function cleanDate(label: string, raw: unknown): string {
  const text = cleanText(label, raw, 10)
  if (!text) return todayIso()
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`))
    && new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text
  if (!ok) throw new AudienceValidationError(`${label}: use YYYY-MM-DD`)
  return text
}

/**
 * Normalize user input for one entity. Does NOT check that linked ids
 * exist; the API does that against the database.
 */
export function cleanInput(kind: EntityKey, input: AudienceInput): CleanInput {
  const ent = ENTITIES[kind]
  const name = cleanText('Name', input.name, LIMITS.name)
  if (!name) throw new AudienceValidationError('Name is required')
  const tags = cleanList('Tags', input.tags)
  const rawFields = (input.fields && typeof input.fields === 'object') ? input.fields : {}
  const rawLinks = (input.links && typeof input.links === 'object') ? input.links : {}

  const fields: Record<string, string | string[]> = {}
  for (const f of valueFields(ent)) {
    const raw = (rawFields as Record<string, unknown>)[f.key]
    if (f.kind === 'list') fields[f.key] = cleanList(f.label, raw)
    else if (f.kind === 'date') fields[f.key] = cleanDate(f.label, raw)
    else fields[f.key] = cleanText(f.label, raw, f.kind === 'text' ? LIMITS.text : LIMITS.line)
  }

  const links: Record<string, string[]> = {}
  for (const f of linkFields(ent)) {
    const raw = (rawLinks as Record<string, unknown>)[f.key]
    const list = raw === undefined || raw === null || raw === '' ? [] : Array.isArray(raw) ? raw : [raw]
    const ids = Array.from(new Set(list.map(v => String(v).trim()).filter(Boolean)))
    if (ids.length > LIMITS.links) throw new AudienceValidationError(`${f.label}: too many links`)
    if (f.kind === 'ref' && ids.length > 1) throw new AudienceValidationError(`${f.label}: choose one`)
    links[f.key] = ids
  }
  return { name, tags, fields, links }
}

// ── Desktop interchange format ──────────────────────────────────────────────
export const EXPORT_FORMAT = 'twc-audience-catalog'
export const EXPORT_VERSION = 1
