/**
 * OpenPhone / Quo provider
 *
 * Auth:       Bearer {api_key} in Authorization header
 * Webhook:    Registered per API key. Events: call.completed + message.received
 * Missed call: call.completed where direction=incoming AND status != 'answered'
 * SMS send:   POST /v1/messages — uses phoneNumberId (not E.164)
 *
 * Stored in DB:
 *   provider_api_key          = OpenPhone API key
 *   provider_phone_number     = E.164 display number (e.g. +16155551234)
 *   provider_phone_number_id  = OpenPhone phoneNumberId (e.g. PNxxxxxxxx)
 *   provider_webhook_id       = webhook ID returned on registration
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const BASE = 'https://api.openphone.com/v1'

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function apiFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenPhone API ${res.status} ${path}: ${text}`)
  }
  // 204 No Content — return null
  if (res.status === 204) return null
  return res.json()
}

// ── Phone number lookup ────────────────────────────────────────────────────

export interface OpenPhoneNumber {
  id: string          // phoneNumberId (PNxxxxxxxx)
  phoneNumber: string // E.164
  name?: string
  type: string
}

/**
 * List all phone numbers associated with this API key.
 * Used during onboarding so the client can pick which number to activate.
 */
export async function listPhoneNumbers(apiKey: string): Promise<OpenPhoneNumber[]> {
  const data = await apiFetch('/phone-numbers', {
    method: 'GET',
    headers: headers(apiKey),
  }) as { data: OpenPhoneNumber[] }
  return data.data ?? []
}

// ── Provider implementation ────────────────────────────────────────────────

export const openphone: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/openphone`

    const data = await apiFetch('/webhooks', {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        events: ['call.completed', 'message.received'],
        url,
      }),
    }) as { data: { id: string } }

    return { webhookId: data.data.id }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await apiFetch(`/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: headers(creds.apiKey!),
    })
  },

  async sendSMS(
    creds: ProviderCredentials,
    _from: string,
    fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    if (!fromId) throw new Error('OpenPhone sendSMS requires provider_phone_number_id')
    await apiFetch('/messages', {
      method: 'POST',
      headers: headers(creds.apiKey!),
      body: JSON.stringify({
        from: fromId,
        to: [to],
        content: message,
      }),
    })
  },

  // OpenPhone does not use OAuth — no refreshTokens implementation
  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
