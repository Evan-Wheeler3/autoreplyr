'use client'

import { useState } from 'react'

interface Question {
  id: number
  message: string
  field: string
}

interface FlowData {
  id: string
  opening_message: string
  questions: Question[]
  high_intent_triggers: string[]
  high_intent_message: string
  standard_message: string
  low_intent_message: string
}

interface ClientInfo {
  business_name: string
  owner_name: string
  booking_link: string | null
}

function fill(template: string, client: ClientInfo): string {
  return template
    .replace(/\{business_name\}/g, client.business_name)
    .replace(/\{owner_name\}/g, client.owner_name)
    .replace(/\{booking_link\}/g, client.booking_link ?? '')
}

function Textarea({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent resize-none transition"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function PhonePreview({ label, message }: { label: string; message: string }) {
  return (
    <div className="text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <div className="flex">
        <div className="ml-auto max-w-[180px] bg-[#1B2A4A] text-white rounded-2xl rounded-br-sm px-2.5 py-1.5 leading-relaxed">
          {message}
        </div>
      </div>
    </div>
  )
}

export function FlowEditor({
  flow: initialFlow,
  client,
  clientId,
}: {
  flow: FlowData
  client: ClientInfo
  clientId: string
}) {
  const [flow, setFlow] = useState(initialFlow)
  const [triggersText, setTriggersText] = useState(initialFlow.high_intent_triggers.join(', '))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FlowData) => (v: string) =>
    setFlow((f) => ({ ...f, [key]: v }))

  function updateQuestion(index: number, field: keyof Question, value: string) {
    setFlow((f) => {
      const qs = [...f.questions]
      qs[index] = { ...qs[index], [field]: value }
      return { ...f, questions: qs }
    })
  }

  function addQuestion() {
    setFlow((f) => ({
      ...f,
      questions: [
        ...f.questions,
        { id: Date.now(), message: '', field: `field_${f.questions.length + 1}` },
      ],
    }))
  }

  function removeQuestion(index: number) {
    setFlow((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== index),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')

    const triggers = triggersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await fetch('/api/dashboard/flow', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        opening_message: flow.opening_message,
        questions: flow.questions,
        high_intent_triggers: triggers,
        high_intent_message: flow.high_intent_message,
        standard_message: flow.standard_message,
        low_intent_message: flow.low_intent_message,
      }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Opening message */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">1. Opening message</h2>
        <p className="text-xs text-gray-500">Sent immediately after a missed call. Keep it short — under 160 characters.</p>
        <Textarea
          label="Message"
          value={flow.opening_message}
          onChange={set('opening_message')}
        />
        <PhonePreview label="Preview" message={fill(flow.opening_message, client)} />
      </div>

      {/* Qualification questions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">2. Qualification questions</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="text-sm text-[#1B2A4A] font-medium hover:underline"
          >
            + Add question
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Shown after the caller replies YES. Keep to 2–3 questions.
        </p>
        {flow.questions.map((q, i) => (
          <div key={q.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Question {i + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <textarea
              value={q.message}
              onChange={(e) => updateQuestion(i, 'message', e.target.value)}
              rows={2}
              placeholder="What service do you need?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] resize-none"
            />
          </div>
        ))}
      </div>

      {/* Intent scoring */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">3. Lead scoring</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">High-intent keywords</label>
          <input
            value={triggersText}
            onChange={(e) => setTriggersText(e.target.value)}
            placeholder="urgent, emergency, asap, right away, today"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          />
          <p className="text-xs text-gray-400 mt-1">Comma-separated. If any appear in a reply, the lead is scored HIGH.</p>
        </div>

        <Textarea
          label="High-intent reply"
          value={flow.high_intent_message}
          onChange={set('high_intent_message')}
          hint="Sent when lead is scored HIGH. You also get an immediate alert."
        />
        <PhonePreview label="Preview" message={fill(flow.high_intent_message, client)} />

        <Textarea
          label="Standard reply"
          value={flow.standard_message}
          onChange={set('standard_message')}
          hint="Sent for medium-intent leads."
        />

        <Textarea
          label="Low-intent reply"
          value={flow.low_intent_message}
          onChange={set('low_intent_message')}
          hint="Sent for low-intent leads."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#243761] transition-colors disabled:opacity-50"
      >
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save flow'}
      </button>
    </div>
  )
}
