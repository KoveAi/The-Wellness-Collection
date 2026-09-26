export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audit, getIp } from '@/lib/audit'
import { AudienceValidationError } from '@/lib/audience'
import { exportCatalog, importCatalog } from '@/lib/audience-server'

// Imports are JSON text; 5 MB is far above any realistic catalog.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), userId: null }
  }
  return { error: null, userId: (session.user as any).id as string | null }
}

/** Download the catalog in the desktop app's JSON format. */
export async function GET(req: NextRequest) {
  const { error, userId } = await requireAdmin()
  if (error) return error
  try {
    const data = await exportCatalog()
    audit('audience.export', { userId, ip: getIp(req) })
    const day = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="audience-catalog-${day}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/audience/transfer]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Import a desktop export. ?mode=replace clears the catalog first; default merges. */
export async function POST(req: NextRequest) {
  const { error, userId } = await requireAdmin()
  if (error) return error
  const replace = req.nextUrl.searchParams.get('mode') === 'replace'
  try {
    const text = await req.text()
    if (text.length > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: 'File is too large to import.' }, { status: 413 })
    }
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'This file is not valid JSON.' }, { status: 400 })
    }
    const counts = await importCatalog(data, replace)
    audit('audience.import', { userId, ip: getIp(req), metadata: { replace, counts } })
    return NextResponse.json({ success: true, counts })
  } catch (err) {
    if (err instanceof AudienceValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/admin/audience/transfer]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
