/**
 * GET /api/auth/ringcentral/callback?code=...&state=...
 *
 * OAuth callback from RingCentral. Exchanges the authorization code for tokens,
 * stores them on the client record, then registers the event subscription webhook.
 *
 * The `state` param is the AutoReplyr client_id set during /authorize.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { exchangeCode } from '@/lib/providers/ringcentral'
import { ringcentral } from '@/lib/providers/ringcentral'
import { env } from '@/lib/env'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const clientId = searchParams.get('state')  // our client_id
  const error = searchParams.get('error')

  const appUrl = env.appUrl()

  if (error || !code || !clientId) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=ringcentral_auth_failed`)
  }

  const db = createAdminClient()

  try {
    const redirectUri = `${appUrl}/api/auth/ringcentral/callback`
    const tokens = await exchangeCode(code, redirectUri)

    // Store tokens + phone number on the client record
    await db.from('clients').update({
      oauth_access_token: tokens.accessToken,
      oauth_refresh_token: tokens.refreshToken,
      oauth_token_expires_at: tokens.expiresAt,
      provider_phone_number: tokens.phoneNumber || null,
      voip_provider: 'ringcentral',
    }).eq('id', clientId)

    // Register the event subscription webhook if subscription_status is active
    const { data: clientData } = await db
      .from('clients')
      .select('subscription_status,provider_webhook_id')
      .eq('id', clientId)
      .single()

    const client = clientData as { subscription_status: string; provider_webhook_id: string | null } | null

    if (client?.subscription_status === 'active' && !client.provider_webhook_id) {
      const result = await ringcentral.registerWebhook(
        { accessToken: tokens.accessToken },
        appUrl,
      )
      await db.from('clients').update({
        provider_webhook_id: result.webhookId,
      }).eq('id', clientId)
    }

    return NextResponse.redirect(`${appUrl}/dashboard?connected=ringcentral`)
  } catch (err) {
    await db.from('errors').insert({
      client_id: clientId,
      context: 'ringcentral_oauth_callback',
      error_message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.redirect(`${appUrl}/dashboard?error=ringcentral_auth_failed`)
  }
}
