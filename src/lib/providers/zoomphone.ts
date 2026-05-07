/**
 * Zoom Phone provider
 *
 * Auth:       OAuth 2.0 — Authorization Code flow
 *             Client credentials in ZOOM_PHONE_CLIENT_ID + ZOOM_PHONE_CLIENT_SECRET env vars
 *             Access/refresh tokens stored in clients.oauth_* columns
 * Webhook:    Zoom event subscriptions — POST /v2/webhooks/event_subscriptions
 *             Subscription ID in clients.provider_webhook_id
 * Missed call: phone.callee_missed event
 * Inbound SMS: phone.sms_received event
 * SMS send:   POST /v2/phone/sms
 *
 * Stored in DB:
 *   oauth_access_token    = Zoom access token
 *   oauth_refresh_token   = Zoom refresh token
 *   oauth_token_expires_at = ISO 8601 expiry
 *   provider_phone_number = E.164 business number
 *   provider_webhook_id   = event subscription ID
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const ZOOM_BASE = 'https://api.zoom.us/v2'
const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize'
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token'

function clientCreds(): string {
  const id = process.env.ZOOM_PHONE_CLIENT_ID ?? ''
  const secret = process.env.ZOOM_PHONE_CLIENT_SECRET ?? ''
  return Buffer.from(`${id}:${secret}`).toString('base64')
}

async function zoomFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${ZOOM_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zoom API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── OAuth helpers ──────────────────────────────────────────────────────────

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOOM_PHONE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    state,
  })
  return `${ZOOM_AUTH_URL}?${params}`
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<OAuthTokens & { phoneNumber: string }> {
  const res = await fetch(
    `${ZOOM_TOKEN_URL}?grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${clientCreds()}` },
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zoom token exchange failed: ${text}`)
  }
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Fetch the user's phone number
  const phoneData = await zoomFetch('/phone/users/me/phone_numbers', data.access_token) as {
    phone_numbers?: Array<{ number: string; primary?: boolean }>
  }
  const phoneNumber =
    phoneData.phone_numbers?.find((p) => p.primary)?.number ??
    phoneData.phone_numbers?.[0]?.number ??
    ''

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    phoneNumber,
  }
}

// ── Provider implementation ────────────────────────────────────────────────

export const zoomphone: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const accessToken = creds.accessToken!
    const url = `${webhookBaseUrl}/api/webhooks/zoomphone`

    const data = await zoomFetch('/webhooks/event_subscriptions', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        event_types: [
          { event: 'phone.callee_missed' },
          { event: 'phone.sms_received' },
        ],
        notification_option: {
          url,
          auth_user: '',
          auth_password: '',
        },
      }),
    }) as { id: string }

    return { webhookId: data.id }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await zoomFetch(
      `/webhooks/event_subscriptions/${webhookId}`,
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
    await zoomFetch('/phone/sms', creds.accessToken!, {
      method: 'POST',
      body: JSON.stringify({
        from_number: from,
        to_number: to,
        message,
      }),
    })
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(
      `${ZOOM_TOKEN_URL}?grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${clientCreds()}` },
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Zoom token refresh failed: ${text}`)
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
