export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWellnessLeadWelcomeEmail } from '@/lib/email'
import { isEmailBlocked } from '@/lib/blocklist'

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json()

    if (!name?.trim() || !email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    const firstName = name.trim().split(/\s+/)[0]

    // Blocked addresses get the normal success shape — nothing is stored,
    // nothing is sent, and the sender learns nothing about the blocklist.
    if (await isEmailBlocked(email)) {
      return NextResponse.json({ success: true })
    }

    // Upsert — re-submitting the gate doesn't error or duplicate
    await prisma.wellnessLead.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {},
      create: { name: name.trim(), email: email.toLowerCase().trim() },
    })

    // Non-blocking — don't fail the unlock if email delivery fails
    sendWellnessLeadWelcomeEmail(email.trim(), firstName).catch(err =>
      console.error('[wellness-lead] email failed:', err)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/leads/wellness]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
