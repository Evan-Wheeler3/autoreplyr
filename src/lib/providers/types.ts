// Credentials passed to every provider function.
// Fields used depend on the provider's auth model.
export interface ProviderCredentials {
  // API-key providers
  apiKey?: string

  // OAuth providers
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string // ISO 8601

  // Provider-specific IDs stored in provider_metadata
  metadata?: Record<string, unknown>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // ISO 8601 — when the access token expires
}

// Every provider must implement these four functions.
// Webhook registration is called once when a subscription becomes active.
// Deregistration is called when a subscription is cancelled.
export interface Provider {
  /**
   * Register a webhook with the provider. Returns a webhookId that must be
   * stored in clients.provider_webhook_id for later deregistration.
   * For providers that store extra IDs (e.g. Dialpad subscription IDs) those
   * go into clients.provider_metadata.
   */
  registerWebhook(
    creds: ProviderCredentials,
    webhookBaseUrl: string,
  ): Promise<RegisterResult>

  /**
   * Remove the webhook from the provider. Called on subscription cancel.
   */
  deregisterWebhook(
    creds: ProviderCredentials,
    webhookId: string,
    metadata: Record<string, unknown>,
  ): Promise<void>

  /**
   * Send an SMS from `from` to `to`.
   * `from` is the value stored in clients.provider_phone_number.
   * `fromId` is clients.provider_phone_number_id (for providers that need it).
   */
  sendSMS(
    creds: ProviderCredentials,
    from: string,
    fromId: string | null,
    to: string,
    message: string,
  ): Promise<void>

  /**
   * OAuth providers only. Exchange a fresh access token using the stored
   * refresh token. Returns the new token set.
   */
  refreshTokens?(refreshToken: string): Promise<OAuthTokens>
}

export interface RegisterResult {
  webhookId: string
  // Any extra IDs that should be persisted in provider_metadata
  metadata?: Record<string, unknown>
}
