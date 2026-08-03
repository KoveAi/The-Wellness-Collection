import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWaitlistWelcomeEmail } from '@/lib/email'
import { isEmailBlocked } from '@/lib/blocklist'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 })
    }

    // Blocked addresses get the normal success shape — nothing is stored,
    // nothing is sent, and the sender learns nothing about the blocklist.
    if (await isEmailBlocked(email)) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    await prisma.wellnessLead.upsert({
      where: { email },
      update: { name },
      create: { name, email },
    })

    // Fire-and-forget — don't block the response on email delivery
    sendWaitlistWelcomeEmail(email, name).catch(err =>
      console.error('[waitlist] email failed', err)
    )

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[waitlist]', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
