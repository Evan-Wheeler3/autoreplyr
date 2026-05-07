/**
 * Kixie webhook handler
 *
 * Events handled:
 *   call event with callstatus = "not answered" | "no answer" → missed call
 *   sms event with direction = "inbound"                       → inbound SMS flow
 *
 * Business number matched via `tonumber` (call) or `to` (SMS) against
 * clients.provider_phone_number (E.164).
 *
 * The Kixie businessId needed for SMS send is stored in provider_metadata.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { kixie } from '@/lib/providers/kixie'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
  provider_metadata: Record<string, unknown>
}

type CallEvent = {
  type: 'call'
  callstatus: string  // "not answered" | "no answer" | "answered" | etc.
  direction: string
  tonumber: string    // business E.164
  fromnumber: string  // caller E.164
}

type SMSEvent = {
  type: 'sms'
  direction: string
  to: string    // business E.164
  from: string  // caller E.164
  body: string
}

const MISSED_STATUSES = new Set(['not answered', 'no answer', 'missed', 'voicemail'])

async function fetchClient(
  db: ReturnType<typeof createAdminClient>,
  businessNumber: string,
): Promise<ClientFull | null> {
  const { data } = await db
    .from('clients')
    .select(
      'id,business_name,owner_name,owner_email,owner_notify_number,' +
      'provider_phone_number,provider_phone_number_id,booking_link,' +
      'subscription_status,grace_period_ends_at,provider_api_key,provider_metadata',
    )
    .eq('voip_provider', 'kixie')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const db = createAdminClient()
  const eventType = body.type as string | undefined

  try {
    if (eventType === 'call') {
      const call = body as unknown as CallEvent
      if (call.direction !== 'inbound') return NextResponse.json({ ok: true })
      if (!MISSED_STATUSES.has(call.callstatus?.toLowerCase())) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, call.tonumber)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.fromnumber, async (to, message) => {
        await kixie.sendSMS(
          { apiKey: client.provider_api_key!, metadata: client.provider_metadata },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (eventType === 'sms') {
      const msg = body as unknown as SMSEvent
      if (msg.direction !== 'inbound') return NextResponse.json({ ok: true })

      const client = await fetchClient(db, msg.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(db, client, msg.from, msg.body, async (to, message) => {
        await kixie.sendSMS(
          { apiKey: client.provider_api_key!, metadata: client.provider_metadata },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `kixie_webhook_${eventType ?? 'unknown'}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
