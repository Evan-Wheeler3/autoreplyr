/**
 * Dialpad provider
 *
 * Auth:       API key in Authorization: Bearer header
 * Webhook:    Two separate event subscriptions are required:
 *               1. Call subscription (call_connected, call_ended events)
 *               2. SMS subscription (sms events)
 *             Both subscription IDs are stored in provider_metadata.
 * Missed call: call_ended event where call_type=voicemail or disposition=missed/no_answer
 * Inbound SMS: sms event where direction=inbound
 * SMS send:   POST /api/v2/sms
 *
 * Stored in DB:
 *   provider_api_key          = Dialpad API key
 *   provider_phone_number     = E.164 business number
 *   provider_webhook_id       = call subscription ID (primary)
 *   provider_metadata         = { sms_subscription_id: string }
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://dialpad.com/api/v2'

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`Dialpad API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const dialpad: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const hookUrl = `${webhookBaseUrl}/api/webhooks/dialpad`

    // Subscription 1: Call events
    const callSub = await apiFetch('/subscriptions', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        webhook_id: hookUrl,
        call_states: ['hangup'],
        // No target filter — we'll match by to_number in the handler
      }),
    }) as { id: string }

    // Subscription 2: SMS events
    const smsSub = await apiFetch('/subscriptions', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        webhook_id: hookUrl,
        sms: true,
      }),
    }) as { id: string }

    return {
      webhookId: callSub.id,
      metadata: { sms_subscription_id: smsSub.id },
    }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const apiKey = creds.apiKey!
    // Delete call subscription
    await apiFetch(`/subscriptions/${webhookId}`, apiKey, { method: 'DELETE' })
    // Delete SMS subscription
    if (metadata.sms_subscription_id) {
      await apiFetch(`/subscriptions/${metadata.sms_subscription_id}`, apiKey, { method: 'DELETE' })
    }
  },

  async sendSMS(
    creds: ProviderCredentials,
    from: string,
    _fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    await apiFetch('/sms', creds.apiKey!, {
      method: 'POST',
      body: JSON.stringify({
        from_number: from,
        to_numbers: [to],
        text: message,
      }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
