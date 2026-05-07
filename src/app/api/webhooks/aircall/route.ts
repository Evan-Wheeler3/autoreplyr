/**
 * Aircall webhook handler
 *
 * Events handled:
 *   call.ended      → missed call detection (inbound, not answered)
 *   message.created → inbound SMS → advances conversation flow
 *
 * Aircall sends an account-level webhook; we distinguish numbers by
 * the number id in the payload (matched against provider_phone_number_id).
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { aircall } from '@/lib/providers/aircall'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
}

// Aircall call.ended payload shape (relevant fields only)
type CallPayload = {
  data: {
    id: number
    direction: string
    answered_at: string | null
    number: { id: number; direct_number: string }
    raw_digits: string  // caller E.164
  }
}

// Aircall message.created payload shape
type MessagePayload = {
  data: {
    id: number
    direction: string
    from: string         // caller E.164
    body: string
    number_id: number    // Aircall number ID
  }
}

async function fetchClient(
  db: ReturnType<typeof createAdminClient>,
  numberId: string,
): Promise<ClientFull | null> {
  const { data } = await db
    .from('clients')
    .select(
      'id,business_name,owner_name,owner_email,owner_notify_number,' +
      'provider_phone_number,provider_phone_number_id,booking_link,' +
      'subscription_status,grace_period_ends_at,provider_api_key',
    )
    .eq('voip_provider', 'aircall')
    .eq('provider_phone_number_id', numberId)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

export async function POST(req: Request) {
  let body: { type?: string; data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { type } = body
  if (!type) return NextResponse.json({ ok: true })

  const db = createAdminClient()

  try {
    if (type === 'call.ended') {
      const payload = body as unknown as CallPayload
      const call = payload.data

      // Only missed inbound calls
      if (call.direction !== 'inbound' || call.answered_at !== null) {
        return NextResponse.json({ ok: true })
      }

      const client = await fetchClient(db, String(call.number.id))
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.raw_digits, async (to, message) => {
        await aircall.sendSMS(
          { apiKey: client.provider_api_key! },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (type === 'message.created') {
      const payload = body as unknown as MessagePayload
      const msg = payload.data

      if (msg.direction !== 'inbound') return NextResponse.json({ ok: true })

      const client = await fetchClient(db, String(msg.number_id))
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(db, client, msg.from, msg.body, async (to, message) => {
        await aircall.sendSMS(
          { apiKey: client.provider_api_key! },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `aircall_webhook_${type}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
