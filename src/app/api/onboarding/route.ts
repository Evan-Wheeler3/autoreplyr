import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export interface OnboardingPayload {
  // Step 1
  businessName: string
  ownerName: string
  ownerEmail: string
  ownerNotifyNumber: string
  industry: string
  bookingLink?: string

  // Step 2
  voipProvider: string
  providerApiKey?: string        // for API-key providers
  providerPhoneNumber: string    // E.164 display number
  providerPhoneNumberId?: string // provider-specific ID (e.g. OpenPhone phoneNumberId)

  // Step 3
  openingMessage: string
}

function defaultFlow(businessName: string, ownerName: string) {
  return {
    opening_message: `Hi, we missed your call at ${businessName}. Reply YES and we'll get right back to you!`,
    questions: [
      { id: 1, message: 'What service are you looking for?', field: 'service' },
      { id: 2, message: 'What is your address or area?', field: 'address' },
    ],
    high_intent_triggers: ['urgent', 'emergency', 'asap', 'right away', 'today'],
    high_intent_action: 'notify_owner',
    high_intent_message: `Thanks! This sounds urgent. ${ownerName} will call you back within 30 minutes.`,
    standard_message: `Thanks for reaching out to ${businessName}! We'll be in touch shortly.`,
    low_intent_message: `Thanks for your message. We'll reach out when we have availability.`,
  }
}

export async function POST(req: Request) {
  let payload: OnboardingPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    businessName,
    ownerName,
    ownerEmail,
    ownerNotifyNumber,
    industry,
    bookingLink,
    voipProvider,
    providerApiKey,
    providerPhoneNumber,
    providerPhoneNumberId,
    openingMessage,
  } = payload

  if (!businessName || !ownerEmail || !ownerNotifyNumber || !voipProvider || !providerPhoneNumber || !openingMessage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createAdminClient()
  const stripe = getStripe()
  const appUrl = env.appUrl()

  // Generate a temporary password — client will use magic link / reset to set their own
  const tempPassword = crypto.randomBytes(16).toString('hex')

  try {
    // Create Supabase auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
      }
      throw new Error(authError?.message ?? 'Failed to create user')
    }

    const userId = authData.user.id

    // Build flow from payload
    const flow = defaultFlow(businessName, ownerName)
    flow.opening_message = openingMessage

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: ownerEmail,
      name: businessName,
      metadata: { owner_name: ownerName },
    })

    // Create client record (subscription_status = 'cancelled' until payment succeeds)
    const { data: clientData, error: clientError } = await db
      .from('clients')
      .insert({
        business_name: businessName,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_notify_number: ownerNotifyNumber,
        industry,
        booking_link: bookingLink || null,
        voip_provider: voipProvider,
        provider_api_key: providerApiKey || null,
        provider_phone_number: providerPhoneNumber,
        provider_phone_number_id: providerPhoneNumberId || null,
        stripe_customer_id: customer.id,
        subscription_status: 'cancelled',
        status: 'active',
      })
      .select()
      .single()

    if (clientError || !clientData) {
      // Cleanup: delete the Stripe customer and auth user on failure
      await stripe.customers.del(customer.id).catch(() => {})
      await db.auth.admin.deleteUser(userId).catch(() => {})
      throw new Error(clientError?.message ?? 'Failed to create client')
    }

    // Link auth user to client
    await db.from('client_users').insert({
      client_id: clientData.id,
      user_id: userId,
    })

    // Create default flow
    await db.from('flows').insert({
      client_id: clientData.id,
      ...flow,
    })

    // Create Stripe checkout session
    const priceId = env.stripePriceId()
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboarding?cancelled=1`,
      subscription_data: {
        metadata: { client_id: clientData.id },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 },
    )
  }
}
