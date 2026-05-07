/**
 * RingCentral provider
 *
 * Auth:       OAuth 2.0 — Authorization Code flow
 *             Client credentials stored in RINGCENTRAL_CLIENT_ID + RINGCENTRAL_CLIENT_SECRET env vars
 *             Access/refresh tokens stored in clients.oauth_access_token / oauth_refresh_token
 * Webhook:    RingCentral "subscriptions" API — POST /restapi/v1.0/subscription
 *             Subscription ID stored in clients.provider_webhook_id
 * Missed call: telephony/sessions event with legs[].type="Call" and legs[].result="Missed"
 * Inbound SMS: sms event with direction="Inbound"
 * SMS send:   POST /restapi/v1.0/account/~/extension/~/sms
 *
 * Stored in DB:
 *   oauth_access_token    = RingCentral access token
 *   oauth_refresh_token   = RingCentral refresh token
 *   oauth_token_expires_at = ISO 8601 expiry
 *   provider_phone_number = E.164 business number (called "phoneNumber" in RC)
 *   provider_webhook_id   = subscription ID
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const API_BASE = 'https://platform.ringcentral.com'
const RC_AUTH_URL = `${API_BASE}/restapi/oauth/authorize`
const RC_TOKEN_URL = `${API_BASE}/restapi/oauth/token`

function clientCreds(): string {
  const id = process.env.RINGCENTRAL_CLIENT_ID ?? ''
  const secret = process.env.RINGCENTRAL_CLIENT_SECRET ?? ''
  return Buffer.from(`${id}:${secret}`).toString('base64')
}

async function rcFetch(
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
    throw new Error(`RingCentral API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── OAuth helpers ──────────────────────────────────────────────────────────

/**
 * Build the OAuth authorization URL to redirect the user to.
 */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.RINGCENTRAL_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    state,
    scope: 'ReadAccounts SMS SubscriptionWebhook',
  })
  return `${RC_AUTH_URL}?${params}`
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<OAuthTokens & { extensionId: string; phoneNumber: string }> {
  const res = await fetch(RC_TOKEN_URL, {
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
    throw new Error(`RingCentral token exchange failed: ${text}`)
  }
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Fetch the extension info to get phone number
  const extRes = await rcFetch(
    '/restapi/v1.0/account/~/extension/~',
    data.access_token,
  ) as { id: string; contact?: { businessPhone?: string }; phoneNumbers?: Array<{ phoneNumber: string; usageType: string }> }

  const phoneNumber =
    extRes.phoneNumbers?.find((p) => p.usageType === 'DirectNumber' || p.usageType === 'BusinessNumber')?.phoneNumber ??
    extRes.contact?.businessPhone ??
    ''

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    extensionId: String(extRes.id),
    phoneNumber,
  }
}

// ── Provider implementation ────────────────────────────────────────────────

export const ringcentral: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const accessToken = creds.accessToken!
    const url = `${webhookBaseUrl}/api/webhooks/ringcentral`

    const data = await rcFetch('/restapi/v1.0/subscription', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        eventFilters: [
          '/restapi/v1.0/account/~/telephony/sessions',
          '/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS',
        ],
        deliveryMode: {
          transportType: 'WebHook',
          address: url,
        },
        expiresIn: 630720000, // max allowed: ~20 years
      }),
    }) as { id: string }

    return { webhookId: data.id }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await rcFetch(
      `/restapi/v1.0/subscription/${webhookId}`,
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
    await rcFetch(
      '/restapi/v1.0/account/~/extension/~/sms',
      creds.accessToken!,
      {
        method: 'POST',
        body: JSON.stringify({
          from: { phoneNumber: from },
          to: [{ phoneNumber: to }],
          text: message,
        }),
      },
    )
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(RC_TOKEN_URL, {
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
      throw new Error(`RingCentral token refresh failed: ${text}`)
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
