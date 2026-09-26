export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audit, getIp } from '@/lib/audit'
import { AudienceValidationError } from '@/lib/audience'
import { deleteRecord, updateRecord } from '@/lib/audience-server'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), userId: null }
  }
  return { error: null, userId: (session.user as any).id as string | null }
}

/** Replace a record's values and links: { name, tags, fields, links } */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, userId } = await requireAdmin()
  if (error) return error
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    const record = await updateRecord(params.id, body)
    if (!record) return NextResponse.json({ error: 'This entry no longer exists.' }, { status: 404 })
    audit('audience.update', { userId, ip: getIp(req), metadata: { id: record.id, kind: record.kind } })
    return NextResponse.json({ record })
  } catch (err) {
    if (err instanceof AudienceValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[PUT /api/admin/audience/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, userId } = await requireAdmin()
  if (error) return error
  try {
    const result = await deleteRecord(params.id)
    if (!result) return NextResponse.json({ error: 'This entry no longer exists.' }, { status: 404 })
    audit('audience.delete', { userId, ip: getIp(req), metadata: { id: params.id, removed: result.deleted } })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[DELETE /api/admin/audience/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
