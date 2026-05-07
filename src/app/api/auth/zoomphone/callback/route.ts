/**
 * GET /api/auth/zoomphone/callback?code=...&state=...
 *
 * OAuth callback from Zoom. Exchanges the code for tokens, stores them,
 * and registers the event subscription webhook if the subscription is active.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { exchangeCode } from '@/lib/providers/zoomphone'
import { zoomphone } from '@/lib/providers/zoomphone'
import { env } from '@/lib/env'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const clientId = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = env.appUrl()

  if (error || !code || !clientId) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=zoomphone_auth_failed`)
  }

  const db = createAdminClient()

  try {
    const redirectUri = `${appUrl}/api/auth/zoomphone/callback`
    const tokens = await exchangeCode(code, redirectUri)

    await db.from('clients').update({
      oauth_access_token: tokens.accessToken,
      oauth_refresh_token: tokens.refreshToken,
      oauth_token_expires_at: tokens.expiresAt,
      provider_phone_number: tokens.phoneNumber || null,
      voip_provider: 'zoomphone',
    }).eq('id', clientId)

    const { data: clientData } = await db
      .from('clients')
      .select('subscription_status,provider_webhook_id')
      .eq('id', clientId)
      .single()

    const client = clientData as { subscription_status: string; provider_webhook_id: string | null } | null

    if (client?.subscription_status === 'active' && !client.provider_webhook_id) {
      const result = await zoomphone.registerWebhook(
        { accessToken: tokens.accessToken },
        appUrl,
      )
      await db.from('clients').update({
        provider_webhook_id: result.webhookId,
      }).eq('id', clientId)
    }

    return NextResponse.redirect(`${appUrl}/dashboard?connected=zoomphone`)
  } catch (err) {
    await db.from('errors').insert({
      client_id: clientId,
      context: 'zoomphone_oauth_callback',
      error_message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.redirect(`${appUrl}/dashboard?error=zoomphone_auth_failed`)
  }
}
