import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ManualEnrollment from './ManualEnrollment'
import LeadsTable from './LeadsTable'
import BlockedEmailsTable from './BlockedEmailsTable'

const FORM_LABELS: Record<string, string> = {
  waitlist: 'Waitlist',
  'affirmation-cards': 'Affirmation Cards',
  contact: 'Contact Form',
  register: 'Registration',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/dashboard')

  // Infrastructure live data — failures are isolated so they never break the page
  const [vercelRes, githubRes, upstashRes, betterRes] = await Promise.allSettled([
    fetch(
      `https://api.vercel.com/v6/deployments?projectId=${process.env.VERCEL_PROJECT_ID}&limit=1`,
      { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, next: { revalidate: 60 } }
    ).then(r => r.ok ? r.json() : Promise.resolve(null)),
    fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'User-Agent': 'TWC-Admin' }, next: { revalidate: 60 } }
    ).then(r => r.ok ? r.json() : Promise.resolve(null)),
    fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/dbsize`,
      { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }, next: { revalidate: 60 } }
    ).then(r => r.ok ? r.json() : Promise.resolve(null)),
    fetch(
      'https://uptime.betterstack.com/api/v2/monitors',
      { headers: { Authorization: `Bearer ${process.env.BETTERSTACK_API_KEY}` }, next: { revalidate: 60 } }
    ).then(r => r.ok ? r.json() : Promise.resolve(null)),
  ])

  const vercel  = vercelRes.status  === 'fulfilled' ? vercelRes.value  : null
  const github  = githubRes.status  === 'fulfilled' ? githubRes.value  : null
  const upstash = upstashRes.status === 'fulfilled' ? upstashRes.value : null
  const better  = betterRes.status  === 'fulfilled' ? betterRes.value  : null

  const latestDeploy   = vercel?.deployments?.[0]
  const deployState    = latestDeploy?.state ?? null
  const deployTime     = latestDeploy?.created ? new Date(latestDeploy.created).toLocaleString() : null
  const deployUrl      = latestDeploy?.url ? `https://${latestDeploy.url}` : null
  const githubPushedAt = github?.pushed_at ? new Date(github.pushed_at).toLocaleString() : null
  const redisKeys      = upstash?.result ?? null
  const betterMonitors: any[] = better?.data ?? []
  const monitorsUp     = betterMonitors.filter((m: any) => m.attributes?.status === 'up').length

  try {
    const [users, courses, certificates, enrollments, auditLogs, wellnessLeads, blockedEmails, blockedAttempts] = await Promise.all([
      prisma.user.findMany({ where: { role: 'STUDENT' }, orderBy: { createdAt: 'desc' } }),
      prisma.course.findMany({
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { enrollments: true } },
          enrollments: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { enrolledAt: 'desc' },
          },
        },
      }),
      prisma.certificate.findMany({ include: { user: true, course: true }, orderBy: { issuedAt: 'desc' }, take: 20 }),
      prisma.enrollment.findMany({ include: { user: true, course: true }, orderBy: { enrolledAt: 'desc' }, take: 20 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.wellnessLead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.blockedEmail.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.blockedAttempt.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ])

    const stats = {
      totalUsers: users.filter(u => u.role === 'STUDENT').length,
      totalEnrollments: enrollments.length,
      totalCertificates: certificates.length,
      totalRevenue: enrollments.reduce((sum, e) => sum + e.paidAmount, 0),
    }

    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '48px' }}>
            {[
              { label: 'Waitlist Leads', value: wellnessLeads.length },
              { label: 'Total Students', value: stats.totalUsers },
              { label: 'Enrollments', value: stats.totalEnrollments },
              { label: 'Certificates Issued', value: stats.totalCertificates },
              { label: 'Revenue', value: `$${(stats.totalRevenue / 100).toFixed(2)}` },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', color: 'var(--text)', fontWeight: 600 }}>{stat.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Waitlist Leads */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>
              Waitlist Leads <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>— coming soon sign-ups</span>
            </h2>
            <LeadsTable leads={wellnessLeads} />
          </section>

          {/* Blocked Emails */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>
              Blocked Emails <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>— kept out of every sign-up form</span>
            </h2>
            <BlockedEmailsTable entries={blockedEmails} />
          </section>

          {/* Blocked Attempts */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>
              Blocked Attempts <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>— sign-ups turned away, most recent first</span>
            </h2>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    {['Email', 'Name', 'Form', 'Matched Rule', 'IP', 'When'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blockedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
                        No blocked attempts yet.
                      </td>
                    </tr>
                  ) : (
                    blockedAttempts.map((attempt: any) => (
                      <tr key={attempt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 500 }}>{attempt.email}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{attempt.name || '—'}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                          {FORM_LABELS[attempt.form] ?? attempt.form}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{attempt.matched}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{attempt.ip || '—'}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          {new Date(attempt.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Courses */}
          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text)' }}>Courses</h2>
              <Link href="/admin/courses" className="btn btn-primary" style={{ fontSize: '14px' }}>Edit Courses →</Link>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    {['Course', 'Duration', 'Price', 'Enrollments', 'Status'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 500 }}>{course.title}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{course.duration}h</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>${(course.price / 100).toFixed(0)}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{course._count.enrollments}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span className={`badge ${course.isActive ? 'badge-success' : 'badge-pending'}`}>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Students */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Recent Students</h2>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'STUDENT').slice(0, 15).map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 500 }}>{user.name}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{user.email}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Manual Enrollment */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Manual Enrollment</h2>
            <ManualEnrollment
              users={users.map(u => ({ id: u.id, name: u.name, email: u.email }))}
              courses={courses.map(c => ({ id: c.id, title: c.title }))}
            />
          </section>

          {/* Enrolled Clients by Course */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Enrolled Clients by Course</h2>
            <div style={{ display: 'grid', gap: '24px' }}>
              {courses.map((course: any) => (
                <div key={course.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', background: 'var(--header)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, margin: 0 }}>{course.title}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{course._count.enrollments} enrolled</span>
                  </div>
                  {course.enrollments.length === 0 ? (
                    <div style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>No enrollments yet.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                          {['Name', 'Email', 'Enrolled'].map(h => (
                            <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {course.enrollments.map((enr: any) => (
                          <tr key={enr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '14px 20px', fontWeight: 500, fontSize: '14px' }}>{enr.user.name}</td>
                            <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{enr.user.email}</td>
                            <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Audit Log */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Audit Log <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>— last 50 events</span></h2>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    {['Time', 'Action', 'User ID', 'IP', 'Details'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <code style={{ fontSize: '12px', background: '#f0f0f0', padding: '3px 7px', borderRadius: '4px' }}>{log.action}</code>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>{log.userId ?? '—'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>{log.ip ?? '—'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No audit events yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Infrastructure */}
          {(() => {
            const supabaseRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').replace('.supabase.co', '')
            const githubRepo = process.env.GITHUB_REPO ?? 'AI-VisionariesStudio/The-Wellness-Collection'
            const sentryOrg = process.env.SENTRY_ORG ?? ''
            const sentryProject = process.env.SENTRY_PROJECT ?? ''
            const deployStateColor = deployState === 'READY' ? '#16a34a' : deployState === 'ERROR' ? '#dc2626' : '#d97706'

            const services = [
              {
                name: 'Vercel',
                role: 'Hosting & Deployment',
                color: '#000',
                url: deployUrl ?? 'https://vercel.com/dashboard',
                details: [
                  { label: 'Last Deploy', value: deployTime ?? '—' },
                  { label: 'Status', value: deployState ?? '—', valueColor: deployState ? deployStateColor : undefined },
                  { label: 'Project ID', value: process.env.VERCEL_PROJECT_ID ?? '—' },
                ],
              },
              {
                name: 'Supabase',
                role: 'Database (PostgreSQL)',
                color: '#3ECF8E',
                url: `https://supabase.com/dashboard/project/${supabaseRef}`,
                details: [
                  { label: 'Project Ref', value: supabaseRef || '—' },
                  { label: 'Host', value: supabaseRef ? `${supabaseRef}.supabase.co` : '—' },
                  { label: 'Region', value: 'us-west-2 (AWS)' },
                ],
              },
              {
                name: 'Stripe',
                role: 'Payments & Billing',
                color: '#635BFF',
                url: 'https://dashboard.stripe.com',
                details: [
                  { label: 'Mode', value: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live') ? 'Live' : 'Test' },
                  { label: 'Webhook', value: process.env.STRIPE_WEBHOOK_SECRET ? 'Configured' : 'Not set' },
                ],
              },
              {
                name: 'Resend',
                role: 'Transactional Email',
                color: '#000',
                url: 'https://resend.com/emails',
                details: [
                  { label: 'From Address', value: process.env.EMAIL_FROM ?? '—' },
                  { label: 'API Key', value: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 12) + '…' : '—' },
                ],
              },
              {
                name: 'Anthropic / Claude AI',
                role: 'AI Features',
                color: '#D4A853',
                url: 'https://console.anthropic.com',
                details: [
                  { label: 'API Key', value: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.slice(0, 18) + '…' : '—' },
                ],
              },
              {
                name: 'Upstash Redis',
                role: 'Rate Limiting & Cache',
                color: '#00E9A3',
                url: 'https://console.upstash.com',
                details: [
                  { label: 'Keys Stored', value: redisKeys !== null ? String(redisKeys) : '—' },
                  { label: 'Host', value: (process.env.UPSTASH_REDIS_REST_URL ?? '').replace('https://', '') || '—' },
                ],
              },
              {
                name: 'Sentry',
                role: 'Error Monitoring',
                color: '#362D59',
                url: sentryOrg && sentryProject ? `https://sentry.io/organizations/${sentryOrg}/projects/${sentryProject}/` : 'https://sentry.io',
                details: [
                  { label: 'Org', value: sentryOrg || '—' },
                  { label: 'Project', value: sentryProject || '—' },
                ],
              },
              {
                name: 'BetterStack',
                role: 'Uptime & Log Management',
                color: '#2563EB',
                url: 'https://uptime.betterstack.com',
                details: [
                  { label: 'Monitors', value: betterMonitors.length > 0 ? String(betterMonitors.length) : '—' },
                  { label: 'Up', value: betterMonitors.length > 0 ? `${monitorsUp} / ${betterMonitors.length}` : '—', valueColor: monitorsUp === betterMonitors.length && betterMonitors.length > 0 ? '#16a34a' : undefined },
                ],
              },
              {
                name: 'GitHub',
                role: 'Source Code Repository',
                color: '#24292F',
                url: `https://github.com/${githubRepo}`,
                details: [
                  { label: 'Repo', value: githubRepo },
                  { label: 'Last Push', value: githubPushedAt ?? '—' },
                  { label: 'Open Issues', value: github?.open_issues_count !== undefined ? String(github.open_issues_count) : '—' },
                ],
              },
              {
                name: 'GitHub Codespaces',
                role: 'Cloud Dev Environment',
                color: '#0969DA',
                url: `https://github.com/codespaces/new?repo=${githubRepo}`,
                details: [
                  { label: 'Repo', value: githubRepo },
                  { label: 'Devcontainer', value: 'Configured' },
                ],
              },
            ]

            return (
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Infrastructure</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {services.map(service => (
                    <div key={service.name} className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: service.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text)' }}>{service.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{service.role}</div>
                        </div>
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                        >
                          Open ↗
                        </a>
                      </div>
                      <div style={{ padding: '12px 20px' }}>
                        {service.details.map(d => (
                          <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{d.label}</span>
                            <code style={{ fontSize: '11px', color: (d as any).valueColor ?? 'var(--text)', background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.value}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })()}

          {/* Certificates Issued */}
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text)', marginBottom: '20px' }}>Certificates Issued</h2>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Course', 'Serial Number', 'Issued'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {certificates.map(cert => (
                    <tr key={cert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 500 }}>{cert.user.name}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{cert.course.title}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <code style={{ fontSize: '12px', background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>{cert.serialNumber}</code>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    )
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('[AdminPage]', err)
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: '48px', textAlign: 'center', maxWidth: '560px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--text)', marginBottom: '12px' }}>
            Something&apos;s not quite right on our end.
          </h2>
          <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '16px', borderRadius: '6px', fontSize: '12px', color: '#c00', overflowX: 'auto', marginBottom: '24px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {err?.message ?? String(err)}
          </pre>
          <Link href="/admin" className="btn btn-primary">Try Again</Link>
        </div>
      </div>
    )
  }
}
