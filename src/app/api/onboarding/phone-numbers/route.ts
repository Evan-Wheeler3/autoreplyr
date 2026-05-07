/**
 * GET /api/onboarding/phone-numbers?provider=openphone&apiKey=...
 *
 * Validates the API key and returns the list of phone numbers the client
 * can choose from. Used in the onboarding form so the client picks their
 * number rather than typing an opaque ID.
 *
 * Currently supports: openphone
 * Future: extend to other API-key providers as needed.
 */

import { listPhoneNumbers } from '@/lib/providers/openphone'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  const apiKey = searchParams.get('apiKey')

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'provider and apiKey required' }, { status: 400 })
  }

  try {
    if (provider === 'openphone') {
      const numbers = await listPhoneNumbers(apiKey)
      return NextResponse.json({ numbers })
    }

    return NextResponse.json({ error: 'Provider not supported for number lookup' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch numbers' },
      { status: 400 },
    )
  }
}
