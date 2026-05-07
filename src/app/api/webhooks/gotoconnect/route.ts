/**
 * GoTo Connect webhook handler
 *
 * Events handled:
 *   call.noanswer   → opens lead + sends opening SMS (inbound only)
 *   message.received → advances conversation flow
 *
 * Business number matched by `toNumber` (call) or `to` (SMS) against
 * clients.provider_phone_number (E.164).
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { gotoconnect } from '@/lib/providers/gotoconnect'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_token_expires_at: string | null
}

type CallNoAnswerEvent = {
  event: 'call.noanswer'
  data: {
    direction: string    // "inbound" | "outbound"
    toNumber: string     // business E.164
    fromNumber: string   // caller E.164
  }
}

type MessageReceivedEvent = {
  event: 'message.received'
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
      'subscription_status,grace_period_ends_at,' +
      'oauth_access_token,oauth_refresh_token,oauth_token_expires_at',
    )
    .eq('voip_provider', 'gotoconnect')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

async function getAccessToken(
  db: ReturnType<typeof createAdminClient>,
  client: ClientFull,
): Promise<string> {
  const expiresAt = client.oauth_token_expires_at
    ? new Date(client.oauth_token_expires_at)
    : new Date(0)

  if (expiresAt.getTime() - Date.now() < 60_000) {
    if (!client.oauth_refresh_token) throw new Error('No refresh token available')
    const fresh = await gotoconnect.refreshTokens!(client.oauth_refresh_token)
    await db.from('clients').update({
      oauth_access_token: fresh.accessToken,
      oauth_refresh_token: fresh.refreshToken,
      oauth_token_expires_at: fresh.expiresAt,
    }).eq('id', client.id)
    return fresh.accessToken
  }

  return client.oauth_access_token ?? (() => { throw new Error('No access token') })()
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
    if (event === 'call.noanswer') {
      const payload = body as unknown as CallNoAnswerEvent
      if (payload.data.direction !== 'inbound') return NextResponse.json({ ok: true })

      const client = await fetchClient(db, payload.data.toNumber)
      if (!client) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      const accessToken = await getAccessToken(db, client)

      await handleMissedCall(db, client, payload.data.fromNumber, async (to, message) => {
        await gotoconnect.sendSMS(
          { accessToken },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (event === 'message.received') {
      const payload = body as unknown as MessageReceivedEvent

      const client = await fetchClient(db, payload.data.to)
      if (!client) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      const accessToken = await getAccessToken(db, client)

      await handleInboundSMS(db, client, payload.data.from, payload.data.body, async (to, message) => {
        await gotoconnect.sendSMS(
          { accessToken },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `gotoconnect_webhook_${event}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
