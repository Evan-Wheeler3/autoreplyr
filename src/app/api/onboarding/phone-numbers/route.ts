/**
 * GET /api/onboarding/phone-numbers?provider=openphone&apiKey=...
 *
 * Validates the API key and returns the list of phone numbers the client
 * can choose from. Used in the onboarding form so the client picks their
 * number rather than typing an opaque ID.
 *
 * Supported providers: openphone, aircall
 */

import { listPhoneNumbers as openphoneNumbers } from '@/lib/providers/openphone'
import { listPhoneNumbers as aircallNumbers } from '@/lib/providers/aircall'
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
      const raw = await openphoneNumbers(apiKey)
      const numbers = raw.map((n) => ({
        id: n.id,
        phoneNumber: n.phoneNumber,
        label: n.name ? `${n.name} (${n.phoneNumber})` : n.phoneNumber,
      }))
      return NextResponse.json({ numbers })
    }

    if (provider === 'aircall') {
      const raw = await aircallNumbers(apiKey)
      const numbers = raw.map((n) => ({
        id: String(n.id),
        phoneNumber: n.direct_number,
        label: n.name ? `${n.name} (${n.direct_number})` : n.direct_number,
      }))
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
