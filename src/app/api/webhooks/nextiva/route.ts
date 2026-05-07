/**
 * Nextiva webhook handler
 *
 * Events handled:
 *   call.missed  → opens lead + sends opening SMS
 *   sms.received → advances conversation flow
 *
 * Business number matched by `to` (call) or `to` (SMS) against
 * clients.provider_phone_number (E.164).
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { nextiva } from '@/lib/providers/nextiva'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  provider_api_key: string | null
}

type CallMissedEvent = {
  event: 'call.missed'
  data: {
    to: string    // business E.164
    from: string  // caller E.164
  }
}

type SMSReceivedEvent = {
  event: 'sms.received'
  data: {
    to: string    // business E.164
    from: string  // caller E.164
    body: string
  }
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
    .eq('voip_provider', 'nextiva')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

export async function POST(req: Request) {
  let body: { event?: string; data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { event } = body
  if (!event) return NextResponse.json({ ok: true })

  const db = createAdminClient()

  try {
    if (event === 'call.missed') {
      const payload = body as unknown as CallMissedEvent
      const client = await fetchClient(db, payload.data.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleMissedCall(db, client, payload.data.from, async (to, message) => {
        await nextiva.sendSMS(
          { apiKey: client.provider_api_key! },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (event === 'sms.received') {
      const payload = body as unknown as SMSReceivedEvent
      const client = await fetchClient(db, payload.data.to)
      if (!client?.provider_api_key) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      await handleInboundSMS(
        db,
        client,
        payload.data.from,
        payload.data.body,
        async (to, message) => {
          await nextiva.sendSMS(
            { apiKey: client.provider_api_key! },
            client.provider_phone_number ?? '',
            client.provider_phone_number_id,
            to,
            message,
          )
        },
      )
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `nextiva_webhook_${event}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
