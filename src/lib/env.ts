function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

export const env = {
  supabaseUrl: () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  resendApiKey: () => requireEnv('RESEND_API_KEY'),
  adminEmail: () => requireEnv('ADMIN_EMAIL'),
  stripeSecretKey: () => requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => requireEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceId: () => requireEnv('STRIPE_PRICE_ID'),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://autoreplyr.com',
}
