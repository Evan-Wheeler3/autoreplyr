/**
 * OpenPhone webhook handler
 *
 * Events handled:
 *   call.completed   → missed call detection → opens lead + sends opening SMS
 *   message.received → inbound SMS → advances conversation flow
 *
 * OpenPhone identifies numbers by a phoneNumberId (PNxxxxxxxx), stored in
 * clients.provider_phone_number_id. We look up clients by that ID.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { openphone } from '@/lib/providers/openphone'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
}

type CallObject = {
  phoneNumberId: string
  from: string
  direction: string
  status: string
  duration?: number
}

type MessageObject = {
  phoneNumberId: string
  from: string
  body: string
  direction: string
}

async function fetchClient(
  db: ReturnType<typeof createAdminClient>,
  phoneNumberId: string,
): Promise<ClientFull | null> {
  const { data } = await db
    .from('clients')
    .select(
      'id,business_name,owner_name,owner_email,owner_notify_number,' +
      'provider_phone_number,provider_phone_number_id,booking_link,' +
      'subscription_status,grace_period_ends_at,provider_api_key',
    )
    .eq('voip_provider', 'openphone')
    .eq('provider_phone_number_id', phoneNumberId)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

export async function POST(req: Request) {
  let body: { type?: string; data?: { object?: unknown } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { type, data } = body
  if (!type || !data?.object) return NextResponse.json({ ok: true })

  const db = createAdminClient()

  try {
    if (type === 'call.completed') {
      const call = data.object as CallObject

      // Only act on incoming calls that were NOT answered
      const isMissed =
        call.direction === 'incoming' &&
        call.status !== 'answered' &&
        call.status !== 'completed'

      if (!isMissed) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, call.phoneNumberId)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.from, async (to, message) => {
        await openphone.sendSMS(
          { apiKey: client.provider_api_key! },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (type === 'message.received') {
      const msg = data.object as MessageObject

      // Only inbound messages from the external caller
      if (msg.direction !== 'incoming') return NextResponse.json({ ok: true })

      const client = await fetchClient(db, msg.phoneNumberId)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(db, client, msg.from, msg.body, async (to, message) => {
        await openphone.sendSMS(
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
      context: `openphone_webhook_${type}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  // Always return 200 — OpenPhone retries on non-2xx
  return NextResponse.json({ ok: true })
}
