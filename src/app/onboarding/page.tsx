'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { OnboardingPayload } from '@/app/api/onboarding/route'
import type { OpenPhoneNumber } from '@/lib/providers/openphone'

// ── constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Roofing', 'Electrician', 'Pest Control',
  'Landscaping', 'Cleaning', 'Garage Doors', 'Appliance Repair', 'Other',
]

interface ProviderOption {
  value: string
  label: string
  authType: 'api_key' | 'oauth' | 'webhook_url'
  apiKeyLabel?: string
  apiKeyPlaceholder?: string
  oauthComingSoon?: boolean
  webhookNote?: string
}

const PROVIDERS: ProviderOption[] = [
  {
    value: 'openphone',
    label: 'OpenPhone / Quo',
    authType: 'api_key',
    apiKeyLabel: 'OpenPhone API Key',
    apiKeyPlaceholder: 'op_live_...',
  },
  {
    value: 'yeastar',
    label: 'Yeastar / 4-Voice',
    authType: 'api_key',
    apiKeyLabel: 'Yeastar API Token',
    apiKeyPlaceholder: 'Paste your Yeastar API token',
  },
  {
    value: 'aircall',
    label: 'Aircall',
    authType: 'api_key',
    apiKeyLabel: 'Aircall API Key',
    apiKeyPlaceholder: 'Paste your Aircall API key',
  },
  {
    value: 'dialpad',
    label: 'Dialpad',
    authType: 'api_key',
    apiKeyLabel: 'Dialpad API Key',
    apiKeyPlaceholder: 'Paste your Dialpad API key',
  },
  {
    value: 'nextiva',
    label: 'Nextiva',
    authType: 'api_key',
    apiKeyLabel: 'Nextiva API Key',
    apiKeyPlaceholder: 'Paste your Nextiva API key',
  },
  {
    value: 'justcall',
    label: 'JustCall',
    authType: 'api_key',
    apiKeyLabel: 'JustCall API Key',
    apiKeyPlaceholder: 'Paste your JustCall API key',
  },
  {
    value: 'kixie',
    label: 'Kixie',
    authType: 'api_key',
    apiKeyLabel: 'Kixie API Key',
    apiKeyPlaceholder: 'Paste your Kixie API key',
  },
  {
    value: 'cloudtalk',
    label: 'CloudTalk',
    authType: 'api_key',
    apiKeyLabel: 'CloudTalk API Key',
    apiKeyPlaceholder: 'Paste your CloudTalk API key',
  },
  {
    value: '8x8',
    label: '8x8',
    authType: 'api_key',
    apiKeyLabel: '8x8 API Key',
    apiKeyPlaceholder: 'Paste your 8x8 API key',
  },
  {
    value: 'ringcentral',
    label: 'RingCentral',
    authType: 'oauth',
    oauthComingSoon: false,
  },
  {
    value: 'zoom_phone',
    label: 'Zoom Phone',
    authType: 'oauth',
    oauthComingSoon: true,
  },
  {
    value: 'goto_connect',
    label: 'GoTo Connect',
    authType: 'oauth',
    oauthComingSoon: true,
  },
  {
    value: 'microsoft_teams',
    label: 'Microsoft Teams Phone',
    authType: 'oauth',
    oauthComingSoon: true,
  },
]

const DEFAULT_OPENING = `Hi! We missed your call at {business_name}. Reply YES and we'll get right back to you!`

// ── types ──────────────────────────────────────────────────────────────────

interface FormState {
  businessName: string
  ownerName: string
  ownerEmail: string
  ownerNotifyNumber: string
  industry: string
  bookingLink: string
  voipProvider: string
  providerApiKey: string
  providerPhoneNumber: string
  providerPhoneNumberId: string // OpenPhone phoneNumberId; empty for E.164 providers
  openingMessage: string
}

// ── step components ────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i < current
                ? 'bg-[#1B2A4A] text-white'
                : i === current
                  ? 'bg-[#1B2A4A] text-white ring-4 ring-blue-100'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 mx-1 ${i < current ? 'bg-[#1B2A4A]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent transition"
    />
  )
}

// ── Step 1: Business Info ──────────────────────────────────────────────────

function Step1({
  form,
  setForm,
  onNext,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
}) {
  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Business name</Label>
        <Input value={form.businessName} onChange={set('businessName')} placeholder="Riverside HVAC" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Your name</Label>
          <Input value={form.ownerName} onChange={set('ownerName')} placeholder="John Smith" required />
        </div>
        <div>
          <Label>Industry</Label>
          <select
            value={form.industry}
            onChange={(e) => set('industry')(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent transition bg-white"
          >
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Email address</Label>
        <Input value={form.ownerEmail} onChange={set('ownerEmail')} type="email" placeholder="john@example.com" required />
      </div>
      <div>
        <Label>Your mobile number <span className="text-gray-400 font-normal">(for high-intent lead alerts)</span></Label>
        <Input value={form.ownerNotifyNumber} onChange={set('ownerNotifyNumber')} type="tel" placeholder="+16155551234" required />
      </div>
      <div>
        <Label>Booking / scheduling link <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Input value={form.bookingLink} onChange={set('bookingLink')} type="url" placeholder="https://calendly.com/..." />
      </div>
      <button type="submit" className="w-full mt-2 bg-[#1B2A4A] text-white rounded-lg py-3 font-medium hover:bg-[#243761] transition-colors">
        Continue →
      </button>
    </form>
  )
}

// ── Step 2: VoIP Provider ──────────────────────────────────────────────────

// Providers where we do a live number lookup after the API key is entered.
const LOOKUP_PROVIDERS = ['openphone']

function Step2({
  form,
  setForm,
  onNext,
  onBack,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
  onBack: () => void
}) {
  const [numbers, setNumbers] = useState<OpenPhoneNumber[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  const selected = PROVIDERS.find((p) => p.value === form.voipProvider)
  const needsLookup = selected && LOOKUP_PROVIDERS.includes(selected.value)

  const fetchNumbers = useCallback(async (provider: string, apiKey: string) => {
    if (!apiKey.trim()) return
    setLookupLoading(true)
    setLookupError('')
    setNumbers([])
    setForm((f) => ({ ...f, providerPhoneNumber: '', providerPhoneNumberId: '' }))
    try {
      const res = await fetch(
        `/api/onboarding/phone-numbers?provider=${provider}&apiKey=${encodeURIComponent(apiKey)}`,
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch numbers')
      setNumbers(data.numbers ?? [])
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Could not load phone numbers')
    } finally {
      setLookupLoading(false)
    }
  }, [setForm])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.voipProvider) return
    if (selected?.oauthComingSoon) return
    // For lookup providers, require a number selection
    if (needsLookup && !form.providerPhoneNumberId) return
    onNext()
  }

  const canContinue =
    !!form.voipProvider &&
    !selected?.oauthComingSoon &&
    (needsLookup ? !!form.providerPhoneNumberId : !!form.providerPhoneNumber)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>Your VoIP phone system</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  voipProvider: p.value,
                  providerApiKey: '',
                  providerPhoneNumber: '',
                  providerPhoneNumberId: '',
                }))
                setNumbers([])
                setLookupError('')
              }}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                form.voipProvider === p.value
                  ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              } ${p.oauthComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={p.oauthComingSoon}
            >
              {p.label}
              {p.oauthComingSoon && (
                <span className="block text-xs text-gray-400 font-normal">Connect after signup</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Don&apos;t see your provider?{' '}
          <a href="mailto:evan@velza.com" className="underline">Email us</a>
        </p>
      </div>

      {selected && !selected.oauthComingSoon && selected.authType === 'api_key' && (
        <div className="space-y-4 border-t pt-4">

          {/* API key input */}
          <div>
            <Label>{selected.apiKeyLabel ?? 'API Key'}</Label>
            <div className="flex gap-2">
              <input
                value={form.providerApiKey}
                onChange={(e) => set('providerApiKey')(e.target.value)}
                placeholder={selected.apiKeyPlaceholder}
                required
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent"
              />
              {needsLookup && (
                <button
                  type="button"
                  onClick={() => fetchNumbers(selected.value, form.providerApiKey)}
                  disabled={!form.providerApiKey.trim() || lookupLoading}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {lookupLoading ? 'Loading…' : 'Load numbers'}
                </button>
              )}
            </div>
            {lookupError && (
              <p className="text-xs text-red-600 mt-1">{lookupError}</p>
            )}
          </div>

          {/* Number picker — shown after lookup for OpenPhone */}
          {needsLookup && numbers.length > 0 && (
            <div>
              <Label>Select your business number</Label>
              <div className="space-y-2">
                {numbers.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      providerPhoneNumber: n.phoneNumber,
                      providerPhoneNumberId: n.id,
                    }))}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      form.providerPhoneNumberId === n.id
                        ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-medium">{n.phoneNumber}</span>
                    {n.name && <span className="text-gray-400 ml-2">{n.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* E.164 input for providers without lookup */}
          {!needsLookup && (
            <div>
              <Label>Business phone number <span className="text-gray-400 font-normal">(the number AutoReplyr texts from)</span></Label>
              <Input
                value={form.providerPhoneNumber}
                onChange={set('providerPhoneNumber')}
                type="tel"
                placeholder="+16155551234"
                required
              />
            </div>
          )}
        </div>
      )}

      {selected?.authType === 'oauth' && !selected.oauthComingSoon && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 border-t mt-4 pt-4">
          After completing checkout, you&apos;ll connect your {selected.label} account via OAuth from your dashboard.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!canContinue}
          className="flex-1 bg-[#1B2A4A] text-white rounded-lg py-3 font-medium hover:bg-[#243761] transition-colors disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </form>
  )
}

// ── Step 3: Customize message ──────────────────────────────────────────────

function Step3({
  form,
  setForm,
  onNext,
  onBack,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
  onBack: () => void
}) {
  const preview = form.openingMessage
    .replace('{business_name}', form.businessName || 'Your Business')
    .replace('{owner_name}', form.ownerName || 'You')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Opening message to missed callers</Label>
        <textarea
          value={form.openingMessage}
          onChange={(e) => setForm((f) => ({ ...f, openingMessage: e.target.value }))}
          rows={4}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent transition resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Use <code className="bg-gray-100 px-1 rounded">{'{business_name}'}</code> and{' '}
          <code className="bg-gray-100 px-1 rounded">{'{owner_name}'}</code> as placeholders.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Preview</p>
        <div className="flex">
          <div className="ml-auto max-w-[220px] bg-[#1B2A4A] text-white text-sm rounded-2xl rounded-br-sm px-3 py-2">
            {preview}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          After this, AutoReplyr asks 2 qualification questions then scores the lead.
          You can customize all of this in your dashboard after setup.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button type="submit" className="flex-1 bg-[#1B2A4A] text-white rounded-lg py-3 font-medium hover:bg-[#243761] transition-colors">
          Continue →
        </button>
      </div>
    </form>
  )
}

// ── Step 4: Review + pay ───────────────────────────────────────────────────

function Step4({
  form,
  onBack,
}: {
  form: FormState
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = PROVIDERS.find((p) => p.value === form.voipProvider)

  async function handlePay() {
    setLoading(true)
    setError('')

    const payload: OnboardingPayload = {
      businessName: form.businessName,
      ownerName: form.ownerName,
      ownerEmail: form.ownerEmail,
      ownerNotifyNumber: form.ownerNotifyNumber,
      industry: form.industry,
      bookingLink: form.bookingLink || undefined,
      voipProvider: form.voipProvider,
      providerApiKey: form.providerApiKey || undefined,
      providerPhoneNumber: form.providerPhoneNumber,
      providerPhoneNumberId: form.providerPhoneNumberId || undefined,
      openingMessage: form.openingMessage,
    }

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-gray-900">Order summary</h3>
        <div className="flex justify-between text-gray-700">
          <span>AutoReplyr — Monthly</span>
          <span className="font-semibold">$97 / mo</span>
        </div>
        <div className="text-xs text-gray-400 border-t pt-3">
          Cancel anytime. No setup fee. Billing starts today.
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Your details</h3>
        <Row label="Business" value={form.businessName} />
        <Row label="Email" value={form.ownerEmail} />
        <Row label="Phone system" value={selected?.label ?? form.voipProvider} />
        <Row label="Business number" value={form.providerPhoneNumber} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="flex-1 bg-[#1B2A4A] text-white rounded-lg py-3 font-medium hover:bg-[#243761] transition-colors disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : 'Pay & activate →'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        Secure checkout powered by Stripe. Your card is never stored on our servers.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const STEP_TITLES = [
  'Tell us about your business',
  'Connect your phone system',
  'Your welcome message',
  'Review & activate',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({
    businessName: '',
    ownerName: '',
    ownerEmail: '',
    ownerNotifyNumber: '',
    industry: '',
    bookingLink: '',
    voipProvider: '',
    providerApiKey: '',
    providerPhoneNumber: '',
    providerPhoneNumberId: '',
    openingMessage: DEFAULT_OPENING,
  })

  const total = STEP_TITLES.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/" className="font-bold text-[#1B2A4A] text-lg">autoreplyr</Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <StepIndicator current={step} total={total} />

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{STEP_TITLES[step]}</h2>

            {step === 0 && (
              <Step1 form={form} setForm={setForm} onNext={() => setStep(1)} />
            )}
            {step === 1 && (
              <Step2 form={form} setForm={setForm} onNext={() => setStep(2)} onBack={() => setStep(0)} />
            )}
            {step === 2 && (
              <Step3 form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <Step4 form={form} onBack={() => setStep(2)} />
            )}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="underline text-gray-600">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
