/**
 * Stripe webhook handler
 *
 * Lifecycle events handled:
 *   customer.subscription.created  → activate, register provider webhook, send setup email
 *   customer.subscription.updated  → sync status, set grace period on past_due
 *   customer.subscription.deleted  → cancel, deregister provider webhook
 *   invoice.payment_failed         → set past_due + 5-day grace period
 *   invoice.payment_succeeded      → clear past_due
 */

import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendSetupEmail } from '@/lib/email'
import { env } from '@/lib/env'
import { getProvider } from '@/lib/providers/registry'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createAdminClient()

  try {
    if (event.type === 'customer.subscription.created') {
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription, db)
    } else if (event.type === 'customer.subscription.updated') {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db)
    } else if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db)
    } else if (event.type === 'invoice.payment_failed') {
      await handlePaymentFailed(event.data.object as Stripe.Invoice, db)
    } else if (event.type === 'invoice.payment_succeeded') {
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice, db)
    }
  } catch (err) {
    await db.from('errors').insert({
      context: `stripe_webhook_${event.type}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}

type DB = ReturnType<typeof createAdminClient>

// ── Full client row needed for webhook registration ────────────────────────

type ClientFull = {
  id: string
  owner_name: string
  owner_email: string
  business_name: string
  voip_provider: string | null
  provider_api_key: string | null
  provider_phone_number: string | null
  provider_phone_number_id: string | null
  provider_webhook_id: string | null
  provider_metadata: Record<string, unknown>
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_token_expires_at: string | null
}

async function handleSubscriptionCreated(sub: Stripe.Subscription, db: DB) {
  const customerId = sub.customer as string

  const { data: rawClient } = await db
    .from('clients')
    .select(
      'id,owner_name,owner_email,business_name,voip_provider,' +
      'provider_api_key,provider_phone_number,provider_phone_number_id,' +
      'provider_webhook_id,provider_metadata,' +
      'oauth_access_token,oauth_refresh_token,oauth_token_expires_at',
    )
    .eq('stripe_customer_id', customerId)
    .single()

  if (!rawClient) return
  const client = rawClient as unknown as ClientFull

  const isActive = sub.status === 'active' || sub.status === 'trialing'

  // Update subscription status first
  await db.from('clients').update({
    stripe_subscription_id: sub.id,
    subscription_status: isActive ? 'active' : 'past_due',
    grace_period_ends_at: null,
  }).eq('id', client.id)

  if (!isActive) return

  // Register webhook with the provider (API-key providers only;
  // OAuth providers register via their own auth callback flow)
  if (client.voip_provider && client.provider_api_key && !client.provider_webhook_id) {
    try {
      await registerProviderWebhook(db, client)
    } catch (err) {
      // Non-fatal — log but don't fail the Stripe event
      await db.from('errors').insert({
        client_id: client.id,
        context: 'stripe_register_webhook',
        error_message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Send provider-specific setup email
  await sendSetupEmail({
    toEmail: client.owner_email,
    ownerName: client.owner_name,
    businessName: client.business_name,
    voipProvider: client.voip_provider,
    providerPhoneNumber: client.provider_phone_number,
  })
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription, db: DB) {
  const customerId = sub.customer as string
  const newStatus =
    sub.status === 'active' || sub.status === 'trialing'
      ? 'active'
      : sub.status === 'past_due'
        ? 'past_due'
        : 'cancelled'

  await db.from('clients').update({
    subscription_status: newStatus,
    grace_period_ends_at:
      newStatus === 'past_due'
        ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        : null,
  }).eq('stripe_customer_id', customerId)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription, db: DB) {
  const customerId = sub.customer as string

  const { data: rawDel } = await db
    .from('clients')
    .select(
      'id,voip_provider,provider_api_key,provider_webhook_id,provider_metadata,' +
      'oauth_access_token,oauth_refresh_token,oauth_token_expires_at',
    )
    .eq('stripe_customer_id', customerId)
    .single()

  const client = rawDel ? (rawDel as unknown as ClientFull) : null

  if (client?.voip_provider && client.provider_webhook_id) {
    try {
      await deregisterProviderWebhook(client)
    } catch (err) {
      await db.from('errors').insert({
        client_id: client.id,
        context: 'stripe_deregister_webhook',
        error_message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await db.from('clients').update({
    subscription_status: 'cancelled',
    grace_period_ends_at: null,
    provider_webhook_id: null,
  }).eq('stripe_customer_id', customerId)
}

async function handlePaymentFailed(invoice: Stripe.Invoice, db: DB) {
  const customerId = invoice.customer as string
  await db.from('clients').update({
    subscription_status: 'past_due',
    grace_period_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  }).eq('stripe_customer_id', customerId)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, db: DB) {
  const customerId = invoice.customer as string
  await db.from('clients').update({
    subscription_status: 'active',
    grace_period_ends_at: null,
  }).eq('stripe_customer_id', customerId)
}

// ── Provider webhook registration helpers ─────────────────────────────────

async function registerProviderWebhook(db: DB, client: ClientFull) {
  const provider = getProvider(client.voip_provider!)
  if (!provider) return

  const appUrl = env.appUrl()
  const creds = buildCreds(client)

  const result = await provider.registerWebhook(creds, appUrl)

  await db.from('clients').update({
    provider_webhook_id: result.webhookId,
    provider_metadata: {
      ...(client.provider_metadata ?? {}),
      ...(result.metadata ?? {}),
    },
  }).eq('id', client.id)
}

async function deregisterProviderWebhook(client: ClientFull) {
  const provider = getProvider(client.voip_provider!)
  if (!provider || !client.provider_webhook_id) return

  const creds = buildCreds(client)
  await provider.deregisterWebhook(creds, client.provider_webhook_id, client.provider_metadata ?? {})
}

function buildCreds(client: ClientFull) {
  return {
    apiKey: client.provider_api_key ?? undefined,
    accessToken: client.oauth_access_token ?? undefined,
    refreshToken: client.oauth_refresh_token ?? undefined,
    tokenExpiresAt: client.oauth_token_expires_at ?? undefined,
    metadata: client.provider_metadata ?? {},
  }
}
