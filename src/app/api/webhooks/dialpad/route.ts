/**
 * Dialpad webhook handler
 *
 * Events handled:
 *   call (state=hangup, direction=inbound, missed) → opens lead + sends opening SMS
 *   sms  (direction=inbound)                       → advances conversation flow
 *
 * Dialpad sends both call and SMS events to the same URL.
 * The business number is `to_number` on call events and `to` on SMS events (E.164),
 * matched against clients.provider_phone_number.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { dialpad } from '@/lib/providers/dialpad'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
}

type CallEvent = {
  event_type: 'call'
  state: string
  direction: string
  to_number: string
  from_number: string
  call_type?: string
  disposition?: string
}

type SMSEvent = {
  event_type: 'sms'
  direction: string
  to: string
  from: string
  text: string
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
      'subscription_status,grace_period_ends_at,provider_api_key',
    )
    .eq('voip_provider', 'dialpad')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

function isMissedCall(call: CallEvent): boolean {
  if (call.direction !== 'inbound' || call.state !== 'hangup') return false
  if (call.call_type === 'voicemail') return true
  const missed = ['missed', 'no_answer', 'voicemail']
  return !!call.disposition && missed.includes(call.disposition)
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const db = createAdminClient()

  try {
    const eventType = body.event_type as string | undefined

    if (eventType === 'call') {
      const call = body as unknown as CallEvent
      if (!isMissedCall(call)) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, call.to_number)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, call.from_number, async (to, message) => {
        await dialpad.sendSMS(
          { apiKey: client.provider_api_key! },
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

      await handleInboundSMS(db, client, msg.from, msg.text, async (to, message) => {
        await dialpad.sendSMS(
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
      context: `dialpad_webhook_${body.event_type ?? 'unknown'}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
