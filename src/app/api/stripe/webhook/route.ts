import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendSetupEmail } from '@/lib/email'
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
      const sub = event.data.object as Stripe.Subscription
      await handleSubscriptionCreated(sub, db)
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      await handleSubscriptionUpdated(sub, db)
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await handleSubscriptionDeleted(sub, db)
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentFailed(invoice, db)
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentSucceeded(invoice, db)
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

async function handleSubscriptionCreated(sub: Stripe.Subscription, db: DB) {
  const customerId = sub.customer as string

  const { data: client } = await db
    .from('clients')
    .select('id, owner_name, owner_email, business_name, voip_provider, provider_phone_number')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!client) return

  await db.from('clients').update({
    stripe_subscription_id: sub.id,
    subscription_status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'past_due',
    grace_period_ends_at: null,
  }).eq('id', client.id)

  // Send the setup email with provider-specific instructions
  if (sub.status === 'active' || sub.status === 'trialing') {
    await sendSetupEmail({
      toEmail: client.owner_email,
      ownerName: client.owner_name,
      businessName: client.business_name,
      voipProvider: client.voip_provider,
      providerPhoneNumber: client.provider_phone_number,
    })
  }
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
    grace_period_ends_at: newStatus === 'past_due'
      ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }).eq('stripe_customer_id', customerId)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription, db: DB) {
  const customerId = sub.customer as string
  await db.from('clients').update({
    subscription_status: 'cancelled',
    grace_period_ends_at: null,
  }).eq('stripe_customer_id', customerId)
}

async function handlePaymentFailed(invoice: Stripe.Invoice, db: DB) {
  const customerId = invoice.customer as string
  const graceEnds = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('clients').update({
    subscription_status: 'past_due',
    grace_period_ends_at: graceEnds,
  }).eq('stripe_customer_id', customerId)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, db: DB) {
  const customerId = invoice.customer as string
  await db.from('clients').update({
    subscription_status: 'active',
    grace_period_ends_at: null,
  }).eq('stripe_customer_id', customerId)
}
