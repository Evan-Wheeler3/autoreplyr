/**
 * Kixie provider
 *
 * Auth:       API key as query param (?apikey=...) on all requests
 * Webhook:    POST /app/webhooks/register to register; DELETE to remove
 * Missed call: callstatus = "not answered" | "no answer" in call webhook
 * Inbound SMS: direction = "inbound" in SMS webhook
 * SMS send:   POST /app/event with action=send_sms
 *
 * Stored in DB:
 *   provider_api_key          = Kixie API key
 *   provider_phone_number     = E.164 business number
 *   provider_metadata         = { business_id: string } (required for SMS send)
 *   provider_webhook_id       = webhook subscription ID
 *
 * Note: Kixie requires a businessId for sending SMS. This is fetched
 * during webhook registration and stored in provider_metadata.
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://apig.kixie.com/app'

function apiUrl(path: string, apiKey: string): string {
  return `${BASE}${path}?apikey=${encodeURIComponent(apiKey)}`
}

async function apiFetch(path: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(apiUrl(path, apiKey), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Kixie API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const kixie: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/kixie`

    // Fetch account info to get businessId (needed for SMS send)
    const account = await apiFetch('/account', apiKey) as { businessid?: string; business_id?: string }
    const businessId = account.businessid ?? account.business_id ?? ''

    // Register webhook for both call and SMS events
    const data = await apiFetch('/webhooks/register', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events: ['call', 'sms'],
      }),
    }) as { id?: string; webhook_id?: string }

    const webhookId = data.id ?? data.webhook_id ?? ''

    return {
      webhookId,
      metadata: { business_id: businessId },
    }
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
    const businessId = creds.metadata?.business_id as string | undefined
    await apiFetch('/event', creds.apiKey!, {
      method: 'POST',
      body: JSON.stringify({
        action: 'send_sms',
        businessid: businessId ?? '',
        fromnumber: from,
        tonumber: to,
        message,
      }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
