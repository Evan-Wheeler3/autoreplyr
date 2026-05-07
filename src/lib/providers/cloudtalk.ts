/**
 * CloudTalk provider
 *
 * Auth:       Basic Auth — API key:API secret stored concatenated in provider_api_key
 * Webhook:    POST /api/v1/webhooks to register; DELETE to remove
 * Missed call: call.missed event
 * Inbound SMS: sms.received event
 * SMS send:   POST /api/v1/messages
 *
 * Stored in DB:
 *   provider_api_key      = "apiKey:apiSecret" (Basic Auth credentials)
 *   provider_phone_number = E.164 business number
 *   provider_webhook_id   = webhook ID returned on registration
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://api.cloudtalk.io/api/v1'

function authHeader(apiKey: string): string {
  // apiKey stored as "key:secret"
  return 'Basic ' + Buffer.from(apiKey).toString('base64')
}

function headers(apiKey: string) {
  return {
    Authorization: authHeader(apiKey),
    'Content-Type': 'application/json',
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
    throw new Error(`CloudTalk API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const cloudtalk: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/cloudtalk`

    const data = await apiFetch('/webhooks', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events: ['call.missed', 'sms.received'],
      }),
    }) as { id: string | number }

    return { webhookId: String(data.id) }
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
    await apiFetch('/messages', creds.apiKey!, {
      method: 'POST',
      body: JSON.stringify({ from, to, text: message }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
