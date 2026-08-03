export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/ratelimit'
import { parseBody, contactSchema } from '@/lib/validate'
import { findBlockRule, recordBlockedAttempt } from '@/lib/blocklist'
import { getIp } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'contact')
  if (limit) return limit

  const { data, error } = await parseBody(req, contactSchema)
  if (error) return error

  const { name, email, subject, message } = data

  // Blocked senders get the normal success shape — the message is discarded
  // and never reaches the inbox.
  const matched = await findBlockRule(email)
  if (matched) {
    recordBlockedAttempt({ email, form: 'contact', matched, name, ip: getIp(req) })
    return NextResponse.json({ success: true })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM = process.env.EMAIL_FROM || 'noreply@gracefullyredefined.com'
    const TO = process.env.CONTACT_EMAIL || 'support@gracefullyredefined.com'

    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #F7F4F2; padding: 32px; border-bottom: 1px solid #E0D8D0; text-align: center;">
            <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7a7065; margin: 0;">New Message</p>
            <h2 style="font-weight: 300; font-size: 28px; margin: 8px 0 0;">Gracefully Redefined</h2>
          </div>
          <div style="padding: 40px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #7a7065; letter-spacing: 0.06em; text-transform: uppercase;">From</p>
            <p style="margin: 0 0 24px; font-size: 16px;">${name} &lt;${email}&gt;</p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #7a7065; letter-spacing: 0.06em; text-transform: uppercase;">Subject</p>
            <p style="margin: 0 0 24px; font-size: 16px;">${subject}</p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #7a7065; letter-spacing: 0.06em; text-transform: uppercase;">Message</p>
            <p style="margin: 0; font-size: 16px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ContactRoute]', err)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}

