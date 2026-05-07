/**
 * GoTo Connect provider
 *
 * Auth:       OAuth 2.0 — Authorization Code flow
 *             Client credentials in GOTOCONNECT_CLIENT_ID + GOTOCONNECT_CLIENT_SECRET env vars
 *             Access/refresh tokens stored in clients.oauth_* columns
 * Webhook:    POST /v1/webhooks to register for call and SMS events
 *             Webhook ID stored in clients.provider_webhook_id
 * Missed call: call.noanswer event (direction inbound)
 * Inbound SMS: message.received event
 * SMS send:   POST /v1/sms/send
 *
 * Stored in DB:
 *   oauth_access_token    = GoTo access token
 *   oauth_refresh_token   = GoTo refresh token
 *   oauth_token_expires_at = ISO 8601 expiry
 *   provider_phone_number = E.164 business number
 *   provider_webhook_id   = webhook ID
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const API_BASE = 'https://api.goto.com'
const AUTH_BASE = 'https://authentication.logmeininc.com'
const AUTH_URL = `${AUTH_BASE}/oauth/authorize`
const TOKEN_URL = `${AUTH_BASE}/oauth/token`

function clientCreds(): string {
  const id = process.env.GOTOCONNECT_CLIENT_ID ?? ''
  const secret = process.env.GOTOCONNECT_CLIENT_SECRET ?? ''
  return Buffer.from(`${id}:${secret}`).toString('base64')
}

async function gotoFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GoTo API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── OAuth helpers ──────────────────────────────────────────────────────────

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOTOCONNECT_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    state,
    scope: 'cr.v1.read call-events.v1.listen sms.v1.send',
  })
  return `${AUTH_URL}?${params}`
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<OAuthTokens & { phoneNumber: string; accountKey: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${clientCreds()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GoTo token exchange failed: ${text}`)
  }
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    account_key: string
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Fetch lines to get business phone number
  const lines = await gotoFetch(
    `/voice/v1/accounts/${data.account_key}/lines`,
    data.access_token,
  ) as { items?: Array<{ phoneNumber?: string }> }

  const phoneNumber = lines.items?.[0]?.phoneNumber ?? ''

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    phoneNumber,
    accountKey: data.account_key,
  }
}

// ── Provider implementation ────────────────────────────────────────────────

export const gotoconnect: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const accessToken = creds.accessToken!
    const url = `${webhookBaseUrl}/api/webhooks/gotoconnect`

    const data = await gotoFetch('/webhooks/v1/webhooks', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events: ['call.noanswer', 'message.received'],
      }),
    }) as { webhookId?: string; id?: string }

    return { webhookId: data.webhookId ?? data.id ?? '' }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await gotoFetch(
      `/webhooks/v1/webhooks/${webhookId}`,
      creds.accessToken!,
      { method: 'DELETE' },
    )
  },

  async sendSMS(
    creds: ProviderCredentials,
    from: string,
    _fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    await gotoFetch('/sms/v1/messages', creds.accessToken!, {
      method: 'POST',
      body: JSON.stringify({
        from,
        to,
        body: message,
      }),
    })
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${clientCreds()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GoTo token refresh failed: ${text}`)
    }
    const data = await res.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  },
}
