/**
 * RingCentral webhook handler
 *
 * Events handled:
 *   telephony/sessions — missed call detection (leg.result === "Missed", direction === "Inbound")
 *   message-store/instant (SMS) — inbound SMS flow (direction === "Inbound")
 *
 * RingCentral requires responding to a validation challenge with the
 * Validation-Token header on the initial subscription request.
 *
 * Tokens are refreshed automatically when expired before sending SMS.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { ringcentral } from '@/lib/providers/ringcentral'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'

type ClientFull = ClientRow & {
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_token_expires_at: string | null
}

type TelephonyEvent = {
  event: string  // ends with /telephony/sessions
  body: {
    legs?: Array<{
      type: string
      direction: string
      result: string  // "Missed" | "Accepted" | etc.
      from: { phoneNumber: string }
      to: { phoneNumber: string }
    }>
  }
}

type SMSEvent = {
  event: string  // ends with /message-store/instant
  body: {
    changes: Array<{
      type: string
      from: { phoneNumber: string }
      to: Array<{ phoneNumber: string }>
    }>
    extensionId: string
    accountId: string
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
    .eq('voip_provider', 'ringcentral')
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  return data as unknown as ClientFull
}

/**
 * Returns a valid access token, refreshing if expired.
 * Persists refreshed tokens to DB.
 */
async function getAccessToken(
  db: ReturnType<typeof createAdminClient>,
  client: ClientFull,
): Promise<string> {
  const expiresAt = client.oauth_token_expires_at
    ? new Date(client.oauth_token_expires_at)
    : new Date(0)

  // Refresh if token expires within 60 seconds
  if (expiresAt.getTime() - Date.now() < 60_000) {
    if (!client.oauth_refresh_token) throw new Error('No refresh token available')
    const fresh = await ringcentral.refreshTokens!(client.oauth_refresh_token)
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
  // RingCentral sends a Validation-Token on first subscription — echo it back
  const validationToken = req.headers.get('validation-token')
  if (validationToken) {
    return new NextResponse(null, {
      status: 200,
      headers: { 'Validation-Token': validationToken },
    })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const event = body.event as string | undefined
  if (!event) return NextResponse.json({ ok: true })

  const db = createAdminClient()

  try {
    if (event.includes('/telephony/sessions')) {
      const payload = body as unknown as TelephonyEvent
      const missedLeg = payload.body.legs?.find(
        (l) => l.direction === 'Inbound' && l.result === 'Missed',
      )
      if (!missedLeg) return NextResponse.json({ ok: true })

      const businessNumber = missedLeg.to.phoneNumber
      const callerNumber = missedLeg.from.phoneNumber

      const client = await fetchClient(db, businessNumber)
      if (!client) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      const accessToken = await getAccessToken(db, client)

      await handleMissedCall(db, client, callerNumber, async (to, message) => {
        await ringcentral.sendSMS(
          { accessToken },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (event.includes('/message-store/instant')) {
      const payload = body as unknown as SMSEvent
      const smsMsgs = payload.body.changes?.filter((c) => c.type === 'SMS')

      for (const msg of smsMsgs ?? []) {
        const businessNumber = msg.to[0]?.phoneNumber
        if (!businessNumber) continue

        const client = await fetchClient(db, businessNumber)
        if (!client) continue
        if (!isSubscriptionActive(client)) continue

        // Fetch the actual message body from RC API
        const accessToken = await getAccessToken(db, client)

        // We need to fetch the message content — the event only tells us it arrived
        // Use the message list API to get the latest inbound SMS from this caller
        const from = msg.from.phoneNumber
        const msgList = await fetch(
          `https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/message-store?` +
          `type=SMS&direction=Inbound&dateFrom=${new Date(Date.now() - 60_000).toISOString()}&perPage=10`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ).then((r) => r.json()) as { records: Array<{ id: string; from: { phoneNumber: string }; subject: string }> }

        const latestMsg = msgList.records?.find((m) => m.from.phoneNumber === from)
        if (!latestMsg) continue

        await handleInboundSMS(db, client, from, latestMsg.subject, async (to, message) => {
          await ringcentral.sendSMS(
            { accessToken },
            client.provider_phone_number ?? '',
            client.provider_phone_number_id,
            to,
            message,
          )
        })
      }
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `ringcentral_webhook_${event}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
