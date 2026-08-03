/**
 * WORKING STANDARDS
 * - No drifting from the task. No hallucinating or guessing — ask when unsure.
 * - Verify before reporting. Absolute excellence: elegance, luxury, class.
 * - Cormorant serif for all display type.
 * - Psychoeducational language only — no clinical/therapy terminology.
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeBlockEntry } from '@/lib/blocklist'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/** Add a blocklist entry. Optionally purges any matching waitlist leads. */
export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  try {
    const body = await req.json()
    const value = normalizeBlockEntry(body.value ?? '')
    const note = (body.note ?? '').trim() || null

    if (!value) {
      return NextResponse.json(
        { error: 'Enter a full email address or a domain such as @example.com.' },
        { status: 400 }
      )
    }

    const entry = await prisma.blockedEmail.upsert({
      where: { value },
      update: { note },
      create: { value, note },
    })

    // Remove anyone already on the waitlist who matches this rule.
    const removed = value.startsWith('@')
      ? await prisma.wellnessLead.deleteMany({
          where: { email: { endsWith: value } },
        })
      : await prisma.wellnessLead.deleteMany({ where: { email: value } })

    return NextResponse.json({ success: true, entry, removedLeads: removed.count })
  } catch (err) {
    console.error('[POST /api/admin/blocked-emails]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Remove a blocklist entry by id. */
export async function DELETE(req: NextRequest) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    await prisma.blockedEmail.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/admin/blocked-emails]', err)
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
  }
}
