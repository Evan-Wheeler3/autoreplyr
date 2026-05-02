'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'pest_control', label: 'Pest Control' },
]

const VOIP_TIERS = [
  { value: 'openphone', label: 'OpenPhone' },
  { value: 'twilio', label: 'Ported number (Twilio)' },
  { value: 'ringcentral', label: 'RingCentral (coming soon)' },
]

export default function NewClientPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    owner_notify_number: '',
    industry: 'hvac',
    voip_tier: 'openphone',
    // OpenPhone fields
    openphone_api_key: '',
    openphone_number_id: '',
    // Twilio fields
    twilio_number: '',
    ring_through_number: '',
    // Shared optional
    booking_link: '',
    status: 'active',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.push(`/admin/clients/${data.client.id}`)
  }

  const isOpenPhone = form.voip_tier === 'openphone'
  const isTwilio = form.voip_tier === 'twilio'

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Client</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <Field label="Business Name" required>
          <input
            value={form.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            required
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner Name" required>
            <input
              value={form.owner_name}
              onChange={(e) => set('owner_name', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Owner Email" required>
            <input
              type="email"
              value={form.owner_email}
              onChange={(e) => set('owner_email', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner Notify Number" required>
            <input
              type="tel"
              placeholder="+15555551234"
              value={form.owner_notify_number}
              onChange={(e) => set('owner_notify_number', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Industry" required>
            <select
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              className={inputCls}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone / VoIP System" required>
            <select
              value={form.voip_tier}
              onChange={(e) => set('voip_tier', e.target.value)}
              className={inputCls}
            >
              {VOIP_TIERS.map((t) => (
                <option key={t.value} value={t.value} disabled={t.value === 'ringcentral'}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        {isOpenPhone && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-4">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">OpenPhone credentials</p>
            <Field label="API Key" required>
              <input
                type="password"
                placeholder="op_live_..."
                value={form.openphone_api_key}
                onChange={(e) => set('openphone_api_key', e.target.value)}
                required={isOpenPhone}
                className={inputCls}
              />
            </Field>
            <Field label="Phone Number ID" required>
              <input
                placeholder="PN... (found in OpenPhone Settings → Integrations → API)"
                value={form.openphone_number_id}
                onChange={(e) => set('openphone_number_id', e.target.value)}
                required={isOpenPhone}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {isTwilio && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Twilio (ported number)</p>
            <Field label="Twilio Number" required>
              <input
                type="tel"
                placeholder="+15555550000"
                value={form.twilio_number}
                onChange={(e) => set('twilio_number', e.target.value)}
                required={isTwilio}
                className={inputCls}
              />
            </Field>
            <Field label="Ring-Through Number">
              <input
                type="tel"
                placeholder="+15555551234 (optional)"
                value={form.ring_through_number}
                onChange={(e) => set('ring_through_number', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        <Field label="Booking Link">
          <input
            type="url"
            placeholder="https://calendly.com/..."
            value={form.booking_link}
            onChange={(e) => set('booking_link', e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create client'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
