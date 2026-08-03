/**
 * WORKING STANDARDS
 * - No drifting from the task. No hallucinating or guessing — ask when unsure.
 * - Verify before reporting. Absolute excellence: elegance, luxury, class.
 * - Cormorant serif for all display type.
 * - Psychoeducational language only — no clinical/therapy terminology.
 */

import { prisma } from '@/lib/prisma'

/**
 * Normalizes a raw blocklist entry typed by an admin.
 * Accepts a full address ("Spammer@Example.com") or a whole-domain rule
 * ("@example.com", "example.com"). Returns null if it can't be interpreted.
 */
export function normalizeBlockEntry(raw: string): string | null {
  const value = (raw ?? '').trim().toLowerCase()
  if (!value) return null

  // Domain rule — stored with a leading "@" so the shape is unambiguous.
  if (value.startsWith('@')) {
    const domain = value.slice(1)
    return isValidDomain(domain) ? `@${domain}` : null
  }

  // Full address.
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null
  }

  // Bare domain typed without the "@" — treat as a domain rule.
  return isValidDomain(value) ? `@${value}` : null
}

function isValidDomain(domain: string): boolean {
  return /^[^\s@.]+(\.[^\s@.]+)+$/.test(domain)
}

/** Splits an address into the candidate blocklist values that would match it. */
function matchCandidates(email: string): string[] {
  const address = (email ?? '').trim().toLowerCase()
  if (!address.includes('@')) return []
  const domain = address.slice(address.lastIndexOf('@') + 1)
  return domain ? [address, `@${domain}`] : [address]
}

/**
 * True if this address is blocked, by exact match or by its domain.
 * Fails open: if the lookup errors, submissions are allowed through rather
 * than silently dropping legitimate sign-ups.
 */
export async function isEmailBlocked(email: string): Promise<boolean> {
  const candidates = matchCandidates(email)
  if (candidates.length === 0) return false

  try {
    const hit = await prisma.blockedEmail.findFirst({
      where: { value: { in: candidates } },
      select: { id: true },
    })
    return hit !== null
  } catch (err) {
    console.error('[blocklist] lookup failed:', err)
    return false
  }
}
