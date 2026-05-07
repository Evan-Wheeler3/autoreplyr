/**
 * 8x8 provider
 *
 * Auth:       API key in Authorization: Bearer header (VSS API)
 * Webhook:    POST /api/v1/webhook to register for call and SMS events
 * Missed call: call event with sessionStatus = "NO_ANSWER" | "MISSED"
 * Inbound SMS: sms event with direction = "MT" (mobile-terminated = inbound to us)
 *              Actually 8x8: inbound from user = "MO" (mobile-originated)
 *              direction: "MO" means caller sent to us; "MT" means we sent to caller
 * SMS send:   POST https://sms.8x8.com/api/v1/subaccounts/{subAccountId}/messages
 *
 * Stored in DB:
 *   provider_api_key      = 8x8 API key (VSS API key)
 *   provider_phone_number = E.164 business number
 *   provider_webhook_id   = webhook ID returned on registration
 *   provider_metadata     = { sub_account_id: string } (required for SMS send)
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

const VSS_BASE = 'https://api.8x8.com/vss/v1'
const SMS_BASE = 'https://sms.8x8.com/api/v1'

function vssHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function vssFetch(path: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${VSS_BASE}${path}`, {
    ...init,
    headers: {
      ...vssHeaders(apiKey),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`8x8 VSS API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function smsFetch(path: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${SMS_BASE}${path}`, {
    ...init,
    headers: {
      ...vssHeaders(apiKey),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`8x8 SMS API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const eightx8: Provider = {
  async registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    const apiKey = creds.apiKey!
    const url = `${webhookBaseUrl}/api/webhooks/8x8`

    // Fetch account info to get subAccountId
    const account = await vssFetch('/accounts/me', apiKey) as {
      subAccountId?: string
      sub_account_id?: string
      id?: string
    }
    const subAccountId = account.subAccountId ?? account.sub_account_id ?? account.id ?? ''

    // Register webhook
    const data = await vssFetch('/webhooks', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events: ['CALL', 'SMS'],
      }),
    }) as { id: string }

    return {
      webhookId: data.id,
      metadata: { sub_account_id: subAccountId },
    }
  },

  async deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
  ): Promise<void> {
    await vssFetch(`/webhooks/${webhookId}`, creds.apiKey!, { method: 'DELETE' })
  },

  async sendSMS(
    creds: ProviderCredentials,
    from: string,
    _fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    const subAccountId = creds.metadata?.sub_account_id as string | undefined
    if (!subAccountId) throw new Error('8x8 sendSMS requires sub_account_id in provider_metadata')

    await smsFetch(`/subaccounts/${subAccountId}/messages`, creds.apiKey!, {
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
