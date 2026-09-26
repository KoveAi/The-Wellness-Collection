/**
 * AUDIENCE CATALOG — server-side data access. Admin API routes only.
 */
import { randomUUID } from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  AudienceInput, AudienceRecordDTO, AudienceValidationError, CleanInput, ENTITIES, ENTITY_KEYS,
  EXPORT_FORMAT, EXPORT_VERSION, EntityKey, cleanInput, isEntityKey, linkFields, valueFields,
} from '@/lib/audience'

type Tx = Prisma.TransactionClient | PrismaClient

const include = { linksOut: { select: { field: true, toId: true } } } as const

type RecordWithLinks = Prisma.AudienceRecordGetPayload<{ include: typeof include }>

export function toDTO(r: RecordWithLinks): AudienceRecordDTO {
  const kind = r.kind as EntityKey
  const links: Record<string, string[]> = {}
  for (const f of linkFields(ENTITIES[kind])) links[f.key] = []
  for (const l of r.linksOut) (links[l.field] ??= []).push(l.toId)
  return {
    id: r.id,
    kind,
    name: r.name,
    tags: r.tags,
    fields: (r.fields ?? {}) as Record<string, string | string[]>,
    links,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export async function listAll(): Promise<AudienceRecordDTO[]> {
  const rows = await prisma.audienceRecord.findMany({
    where: { kind: { in: [...ENTITY_KEYS] } },
    include,
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(toDTO)
}

/** Every linked id must exist and be of the field's target kind. */
async function assertLinkTargets(tx: Tx, kind: EntityKey, clean: CleanInput, selfId?: string) {
  for (const f of linkFields(ENTITIES[kind])) {
    const ids = clean.links[f.key]
    if (!ids.length) continue
    if (selfId && ids.includes(selfId) && f.target === kind) {
      throw new AudienceValidationError(`${f.label}: a record cannot link to itself`)
    }
    const found = await tx.audienceRecord.count({ where: { id: { in: ids }, kind: f.target } })
    if (found !== ids.length) {
      throw new AudienceValidationError(`${f.label}: some linked records no longer exist`)
    }
  }
}

function linkRows(kind: EntityKey, fromId: string, clean: CleanInput) {
  return linkFields(ENTITIES[kind]).flatMap(f =>
    clean.links[f.key].map(toId => ({ fromId, field: f.key, toId })))
}

export async function createRecord(kind: EntityKey, input: AudienceInput): Promise<AudienceRecordDTO> {
  const clean = cleanInput(kind, input)
  return prisma.$transaction(async tx => {
    await assertLinkTargets(tx, kind, clean)
    const rec = await tx.audienceRecord.create({
      data: { kind, name: clean.name, tags: clean.tags, fields: clean.fields },
    })
    const rows = linkRows(kind, rec.id, clean)
    if (rows.length) await tx.audienceLink.createMany({ data: rows })
    return toDTO(await tx.audienceRecord.findUniqueOrThrow({ where: { id: rec.id }, include }))
  })
}

export async function updateRecord(id: string, input: AudienceInput): Promise<AudienceRecordDTO | null> {
  return prisma.$transaction(async tx => {
    const existing = await tx.audienceRecord.findUnique({ where: { id } })
    if (!existing || !isEntityKey(existing.kind)) return null
    const kind = existing.kind
    const clean = cleanInput(kind, input)
    await assertLinkTargets(tx, kind, clean, id)
    await tx.audienceRecord.update({
      where: { id },
      data: { name: clean.name, tags: clean.tags, fields: clean.fields },
    })
    await tx.audienceLink.deleteMany({ where: { fromId: id } })
    const rows = linkRows(kind, id, clean)
    if (rows.length) await tx.audienceLink.createMany({ data: rows })
    return toDTO(await tx.audienceRecord.findUniqueOrThrow({ where: { id }, include }))
  })
}

/**
 * Delete a record. Links to and from it cascade. Engagement patterns that
 * belong to a deleted persona are deleted too, matching the desktop app
 * (a pattern without its persona has no meaning).
 */
export async function deleteRecord(id: string): Promise<{ deleted: number } | null> {
  return prisma.$transaction(async tx => {
    const existing = await tx.audienceRecord.findUnique({ where: { id } })
    if (!existing) return null
    let deleted = 0
    if (existing.kind === 'personas') {
      const owned = await tx.audienceLink.findMany({
        where: { toId: id, field: 'persona_id', from: { kind: 'engagement_patterns' } },
        select: { fromId: true },
      })
      if (owned.length) {
        const res = await tx.audienceRecord.deleteMany({ where: { id: { in: owned.map(o => o.fromId) } } })
        deleted += res.count
      }
    }
    await tx.audienceRecord.delete({ where: { id } })
    return { deleted: deleted + 1 }
  })
}

// ── Desktop interchange ─────────────────────────────────────────────────────

/** Export in the desktop app's JSON format. Ids become small integers local to the file. */
export async function exportCatalog() {
  const all = await listAll()
  const intIds = new Map<string, number>()
  const byKind: Record<string, AudienceRecordDTO[]> = {}
  for (const key of ENTITY_KEYS) {
    byKind[key] = all.filter(r => r.kind === key)
    byKind[key].forEach((r, i) => intIds.set(r.id, i + 1))
  }
  const out: Record<string, unknown> = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
  for (const key of ENTITY_KEYS) {
    const ent = ENTITIES[key]
    out[key] = byKind[key].map(r => {
      const row: Record<string, unknown> = {
        id: intIds.get(r.id),
        created_at: r.createdAt.replace(/\.\d{3}Z$/, 'Z'),
        updated_at: r.updatedAt.replace(/\.\d{3}Z$/, 'Z'),
        name: r.name,
        tags: r.tags,
      }
      for (const f of valueFields(ent)) row[f.key] = r.fields[f.key] ?? (f.kind === 'list' ? [] : '')
      for (const f of linkFields(ent)) {
        const ids = (r.links[f.key] ?? []).map(id => intIds.get(id)).filter((n): n is number => !!n)
        row[f.key] = f.kind === 'ref' ? (ids[0] ?? null) : ids.sort((a, b) => a - b)
      }
      return row
    })
  }
  return out
}

/**
 * Import a desktop-format export. All or nothing. `replace` clears the
 * catalog first. Returns rows imported per entity.
 */
export async function importCatalog(data: unknown, replace: boolean): Promise<Record<string, number>> {
  if (!data || typeof data !== 'object' || Array.isArray(data) || (data as any).format !== EXPORT_FORMAT) {
    throw new AudienceValidationError('This file is not an Audience Catalog export.')
  }
  if ((data as any).version !== EXPORT_VERSION) {
    throw new AudienceValidationError(`Export version ${JSON.stringify((data as any).version)} is not supported.`)
  }

  // Build everything in memory first so validation errors surface before any write.
  const idMap: Record<string, Map<string, string>> = {}
  const records: { id: string; kind: EntityKey; name: string; tags: string[]; fields: Prisma.InputJsonValue }[] = []
  const links: { fromId: string; field: string; toId: string }[] = []
  const counts: Record<string, number> = {}

  for (const key of ENTITY_KEYS) {
    const ent = ENTITIES[key]
    idMap[key] = new Map()
    const rows = (data as any)[key] ?? []
    if (!Array.isArray(rows)) throw new AudienceValidationError(`${ent.label}: expected a list`)
    rows.forEach((raw: any, n: number) => {
      if (!raw || typeof raw !== 'object') throw new AudienceValidationError(`${ent.label} #${n + 1}: expected an object`)
      const newId = randomUUID()
      const fields: Record<string, unknown> = {}
      for (const f of valueFields(ent)) fields[f.key] = raw[f.key]
      const rawLinks: Record<string, string[]> = {}
      for (const f of linkFields(ent)) {
        const vals = f.kind === 'ref' ? (raw[f.key] ? [raw[f.key]] : []) : (Array.isArray(raw[f.key]) ? raw[f.key] : [])
        // Targets always come earlier in ENTITY_KEYS, so their ids are already mapped.
        rawLinks[f.key] = vals.map((v: unknown) => idMap[f.target!].get(String(v))).filter(Boolean) as string[]
      }
      let clean: CleanInput
      try {
        clean = cleanInput(key, { name: raw.name, tags: raw.tags, fields, links: rawLinks })
      } catch (e) {
        if (e instanceof AudienceValidationError) throw new AudienceValidationError(`${ent.label} #${n + 1}: ${e.message}`)
        throw e
      }
      if (raw.id !== undefined && raw.id !== null) idMap[key].set(String(raw.id), newId)
      records.push({ id: newId, kind: key, name: clean.name, tags: clean.tags, fields: clean.fields })
      links.push(...linkRows(key, newId, clean))
    })
    counts[key] = rows.length
  }

  await prisma.$transaction(async tx => {
    if (replace) await tx.audienceRecord.deleteMany({})
    if (records.length) await tx.audienceRecord.createMany({ data: records })
    if (links.length) await tx.audienceLink.createMany({ data: links })
  }, { timeout: 30_000 })
  return counts
}
