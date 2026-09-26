export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audit, getIp } from '@/lib/audit'
import { AudienceValidationError, isEntityKey } from '@/lib/audience'
import { createRecord, listAll } from '@/lib/audience-server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), userId: null }
  }
  return { error: null, userId: (session.user as any).id as string | null }
}

/** Every catalog record, with links. The catalog is small enough to send whole. */
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    return NextResponse.json({ records: await listAll() })
  } catch (err) {
    console.error('[GET /api/admin/audience]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Create a record: { kind, name, tags, fields, links } */
export async function POST(req: NextRequest) {
  const { error, userId } = await requireAdmin()
  if (error) return error
  try {
    const body = await req.json().catch(() => null)
    if (!body || !isEntityKey(body.kind)) {
      return NextResponse.json({ error: 'Unknown section.' }, { status: 400 })
    }
    const record = await createRecord(body.kind, body)
    audit('audience.create', { userId, ip: getIp(req), metadata: { id: record.id, kind: record.kind } })
    return NextResponse.json({ record }, { status: 201 })
  } catch (err) {
    if (err instanceof AudienceValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/admin/audience]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
