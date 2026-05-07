/**
 * Aircall provider
 *
 * Auth:       Basic Auth — apiId:apiToken stored concatenated in provider_api_key
 * Webhook:    Account-level webhook registered via POST /v1/webhooks
 * Missed call: call.ended where direction=inbound and answered_at is null
 * Inbound SMS: message.created where direction=inbound
 * SMS send:   POST /v1/numbers/{numberId}/messages
 *
 * Stored in DB:
 *   provider_api_key          = "apiId:apiToken" (Basic Auth credentials)
 *   provider_phone_number     = E.164 display number (e.g. +16155551234)
 *   provider_phone_number_id  = Aircall numeric number ID (e.g. "123456")
 *   provider_webhook_id       = webhook ID returned on registration
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://api.aircall.io/v1'

function authHeader(apiKey: string): string {
  // apiKey stored as "apiId:apiToken"
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
    throw new Error(`Aircall API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Phone number lookup ────────────────────────────────────────────────────

export interface AircallNumber {
  id: number
  direct_number: string  // E.164
  name: string
  digits: string         // formatted display number
}

/**
 * List all numbers on this Aircall account.
 * apiKey must be "apiId:apiToken".
 */
export async function listPhoneNumbers(apiKey: string): Promise<AircallNumber[]> {
  const data = await apiFetch('/numbers', apiKey) as { numbers: AircallNumber[] }
  return data.numbers ?? []
}

// ── Provider implementation ────────────────────────────────────────────────

export const aircall: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/aircall`

    const data = await apiFetch('/webhooks', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          url,
          events: ['call.ended', 'message.created'],
        },
      }),
    }) as { webhook: { id: number } }

    return { webhookId: String(data.webhook.id) }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await apiFetch(`/webhooks/${webhookId}`, creds.apiKey!, { method: 'DELETE' })
  },

  async sendSMS(
    creds: ProviderCredentials,
    _from: string,
    fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    if (!fromId) throw new Error('Aircall sendSMS requires provider_phone_number_id')
    await apiFetch(`/numbers/${fromId}/messages`, creds.apiKey!, {
      method: 'POST',
      body: JSON.stringify({ to, body: message }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
