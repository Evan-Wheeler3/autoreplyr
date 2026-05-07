/**
 * Zoom Phone webhook handler
 *
 * Events handled:
 *   phone.callee_missed → opens lead + sends opening SMS
 *   phone.sms_received  → advances conversation flow
 *
 * Zoom sends a CRC challenge (endpoint.url_validation) on subscription creation —
 * we respond with an HMAC-SHA256 hash of the challenge using the webhook secret token.
 *
 * Business number matched by `payload.object.callee_number` (call) or
 * `payload.object.phone_number` (SMS) against clients.provider_phone_number.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  handleMissedCall,
  handleInboundSMS,
  isSubscriptionActive,
} from '@/lib/missed-call'
import { zoomphone } from '@/lib/providers/zoomphone'
import { NextResponse } from 'next/server'
import type { ClientRow } from '@/lib/missed-call'
import crypto from 'crypto'

type ClientFull = ClientRow & {
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_token_expires_at: string | null
}

type ZoomEvent = {
  event: string
  payload: {
    object?: {
      callee_number?: string   // business E.164 on missed call
      caller_number?: string   // caller E.164 on missed call
      phone_number?: string    // business E.164 on SMS
      caller?: { phone_number?: string }  // caller E.164 on SMS
      message?: string         // SMS body
    }
    plainToken?: string        // CRC challenge
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
    .eq('voip_provider', 'zoomphone')
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
    const fresh = await zoomphone.refreshTokens!(client.oauth_refresh_token)
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
  let body: ZoomEvent
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // Zoom CRC challenge for subscription validation
  if (body.event === 'endpoint.url_validation') {
    const token = process.env.ZOOM_PHONE_WEBHOOK_SECRET_TOKEN ?? ''
    const plainToken = body.payload?.plainToken ?? ''
    const hash = crypto.createHmac('sha256', token).update(plainToken).digest('hex')
    return NextResponse.json({
      plainToken,
      encryptedToken: hash,
    })
  }

  const db = createAdminClient()
  const { event, payload } = body

  try {
    if (event === 'phone.callee_missed') {
      const obj = payload.object
      if (!obj?.callee_number || !obj.caller_number) return NextResponse.json({ ok: true })

      const client = await fetchClient(db, obj.callee_number)
      if (!client) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      const accessToken = await getAccessToken(db, client)

      await handleMissedCall(db, client, obj.caller_number, async (to, message) => {
        await zoomphone.sendSMS(
          { accessToken },
          client.provider_phone_number ?? '',
          client.provider_phone_number_id,
          to,
          message,
        )
      })
    } else if (event === 'phone.sms_received') {
      const obj = payload.object
      if (!obj?.phone_number) return NextResponse.json({ ok: true })

      const callerNumber = obj.caller?.phone_number ?? ''
      const smsBody = obj.message ?? ''

      const client = await fetchClient(db, obj.phone_number)
      if (!client) return NextResponse.json({ ok: true })
      if (!isSubscriptionActive(client)) return NextResponse.json({ ok: true })

      const accessToken = await getAccessToken(db, client)

      await handleInboundSMS(db, client, callerNumber, smsBody, async (to, message) => {
        await zoomphone.sendSMS(
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
      context: `zoomphone_webhook_${event}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
