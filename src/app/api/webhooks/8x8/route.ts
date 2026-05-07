/**
 * 8x8 webhook handler
 *
 * Events handled:
 *   CALL with sessionStatus NO_ANSWER/MISSED → missed call flow
 *   SMS  with direction MO (mobile-originated = inbound from caller) → SMS flow
 *
 * Business number matched via `to` (call) or `to` (SMS) against
 * clients.provider_phone_number (E.164).
 *
 * The 8x8 subAccountId for SMS send is stored in provider_metadata.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { eightx8 } from '@/lib/providers/eightx8'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
  provider_metadata: Record<string, unknown>
}

type CallEvent = {
  type: 'CALL'
  sessionStatus: string  // "NO_ANSWER" | "MISSED" | "ANSWERED" | etc.
  direction: string      // "INBOUND" | "OUTBOUND"
  to: string             // business E.164
  from: string           // caller E.164
}

type SMSEvent = {
  type: 'SMS'
  direction: string  // "MO" = caller → us (inbound), "MT" = us → caller (outbound)
  to: string         // business E.164
  from: string       // caller E.164
  body: string
}

const MISSED_STATUSES = new Set(['NO_ANSWER', 'MISSED', 'NO_ANSWER_VOICEMAIL'])

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
    .eq('voip_provider', '8x8')
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
  const eventType = (body.type as string | undefined)?.toUpperCase()

  try {
    if (eventType === 'CALL') {
      const call = body as unknown as CallEvent
      if (call.direction?.toUpperCase() !== 'INBOUND') return NextResponse.json({ ok: true })
      if (!MISSED_STATUSES.has(call.sessionStatus?.toUpperCase())) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, call.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.from, async (to, message) => {
        await eightx8.sendSMS(
          { apiKey: client.provider_api_key!, metadata: client.provider_metadata },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (eventType === 'SMS') {
      const msg = body as unknown as SMSEvent
      // MO = mobile-originated = caller sent to us = inbound
      if (msg.direction?.toUpperCase() !== 'MO') return NextResponse.json({ ok: true })

      const client = await fetchClient(db, msg.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(db, client, msg.from, msg.body, async (to, message) => {
        await eightx8.sendSMS(
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
      context: `8x8_webhook_${eventType ?? 'unknown'}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
