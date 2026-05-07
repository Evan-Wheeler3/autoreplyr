/**
 * Yeastar P-Series webhook handler
 *
 * Events handled:
 *   30012 (Call End Details) — missed inbound call → opens lead + sends SMS
 *   sms.received             — inbound SMS → advances conversation flow
 *
 * Field reference for Event 30012:
 *   https://help.yeastar.com/en/p-series-cloud-edition/event-list/30012-call-end-details.html
 *   callDirection: 0=inbound, 1=outbound, 2=internal
 *   callStatus:    0=answered, 3=unanswered/missed
 *
 * Business number matched by `to` (call) or `To` (SMS) against
 * clients.provider_phone_number (E.164).
 *
 * provider_metadata.pbx_domain is required for SMS send.
 * provider_api_key is the Yeastar API token.
 *
 * Webhook registration is manual — client pastes
 *   https://autoreplyr.com/api/webhooks/yeastar
 * into Yeastar Admin > Event Center > Webhook Notifications.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { yeastar } from '@/lib/providers/yeastar'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
  provider_metadata: Record<string, unknown>
}

type CallEndEvent = {
  event: number        // 30012
  from: string         // caller E.164
  to: string           // business E.164
  callDirection: number // 0=inbound
  callStatus: number   // 0=answered, 3=unanswered
  duration: number
}

type SMSReceivedEvent = {
  event: 'sms.received'
  From: string   // caller E.164
  To: string     // business E.164
  Content: string
}

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
    .eq('voip_provider', 'yeastar')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

function makeSendSMS(client: ClientFull) {
  return async (to: string, message: string) => {
    await yeastar.sendSMS(
      { apiKey: client.provider_api_key!, metadata: client.provider_metadata },
      client.provider_phone_number ?? '',
      client.provider_phone_number_id,
      to,
      message,
    )
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const db = createAdminClient()
  const event = body.event

  try {
    if (event === 30012) {
      const call = body as unknown as CallEndEvent

      // Only missed inbound calls
      if (call.callDirection !== 0) return NextResponse.json({ ok: true })
      if (call.callStatus !== 3 && call.duration !== 0) return NextResponse.json({ ok: true })
      if (!call.from || !call.to) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, call.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.from, makeSendSMS(client))
    } else if (event === 'sms.received') {
      const msg = body as unknown as SMSReceivedEvent
      if (!msg.From || !msg.To) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, msg.To)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(db, client, msg.From, msg.Content, makeSendSMS(client))
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `yeastar_webhook_${event}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
