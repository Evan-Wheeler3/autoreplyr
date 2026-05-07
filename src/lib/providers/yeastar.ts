/**
 * Yeastar P-Series provider
 *
 * Auth:       Long-lived API token from Yeastar admin panel, stored in provider_api_key
 *             PBX domain (e.g. "abc.yeastar.cloud") stored in provider_metadata.pbx_domain
 * Webhook:    NO auto-registration — client manually pastes the AutoReplyr URL into
 *             Yeastar Admin Panel > Event Center > Webhook Notifications.
 *             registerWebhook() is a no-op that returns { webhookId: 'manual' }.
 * Missed call: Event 30012 (Call End Details) with CallStatus=0 (not answered) and
 *              Direction=inbound
 * SMS send:   POST https://{pbx_domain}/openapi/v1.0/sms/send
 *
 * Stored in DB:
 *   provider_api_key      = Yeastar API access token
 *   provider_phone_number = E.164 business number
 *   provider_webhook_id   = 'manual' (sentinel — tells Stripe handler registration is done)
 *   provider_metadata     = { pbx_domain: "abc.yeastar.cloud" }
 *
 * Setup email for Yeastar clients must include the webhook URL to paste:
 *   https://autoreplyr.com/api/webhooks/yeastar
 * and the exact Yeastar admin path:
 *   Admin Panel > Event Center > Webhook Notifications > Add
 *   Event: "30012 - Call End Details"
 */

import type { Provider, ProviderCredentials, RegisterResult, OAuthTokens } from './types'

async function smsFetch(
  pbxDomain: string,
  apiToken: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`https://${pbxDomain}/openapi/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Yeastar API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Provider implementation ────────────────────────────────────────────────

export const yeastar: Provider = {
  // Webhook registration is manual — the client pastes our URL in their Yeastar admin.
  // We return a sentinel ID so the Stripe handler knows not to call us again.
  async registerWebhook(
    _creds: ProviderCredentials,
    _webhookBaseUrl: string,
  ): Promise<RegisterResult> {
    return { webhookId: 'manual' }
  },

  // Nothing to deregister — it's a URL the client pasted manually.
  async deregisterWebhook(): Promise<void> {
    // no-op
  },

  async sendSMS(
    creds: ProviderCredentials,
    from: string,
    _fromId: string | null,
    to: string,
    message: string,
  ): Promise<void> {
    const pbxDomain = creds.metadata?.pbx_domain as string | undefined
    if (!pbxDomain) throw new Error('Yeastar sendSMS requires pbx_domain in provider_metadata')

    await smsFetch(pbxDomain, creds.apiKey!, '/sms/send', {
      method: 'POST',
      body: JSON.stringify({ from, to, content: message }),
    })
  },

  refreshTokens: undefined as unknown as (rt: string) => Promise<OAuthTokens>,
}
