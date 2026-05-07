/**
 * JustCall provider
 *
 * Auth:       Basic Auth — apiKey:apiSecret stored concatenated in provider_api_key
 * Webhook:    POST /v2.1/webhooks to register a global webhook for all numbers
 * Missed call: call.missed event
 * Inbound SMS: sms.received event
 * SMS send:   POST /v2.1/texts/new
 *
 * Stored in DB:
 *   provider_api_key      = "apiKey:apiSecret" (Basic Auth credentials)
 *   provider_phone_number = E.164 business number (matched in webhook payload)
 *   provider_webhook_id   = webhook ID returned on registration
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://api.justcall.io/v2.1'

function authHeader(apiKey: string): string {
  // apiKey stored as "key:secret"
  return 'Basic ' + Buffer.from(apiKey).toString('base64')
}

function headers(apiKey: string) {
  return {
    Authorization: authHeader(apiKey),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function apiFetch(path: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...headers(apiKey),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`JustCall API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const justcall: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/justcall`

    const data = await apiFetch('/webhooks', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events: ['call.missed', 'sms.received'],
      }),
    }) as { data: { id: number | string } }

    return { webhookId: String(data.data.id) }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await apiFetch(`/webhooks/${webhookId}`, creds.apiKey!, { method: 'DELETE' })
  },

  async sendSMS(
    creds: ProviderCredentials,
    from: string,
    _fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    await apiFetch('/texts/new', creds.apiKey!, {
      method: 'POST',
      body: JSON.stringify({
        from,
        to,
        body: message,
      }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
