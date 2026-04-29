'use client'

import { useState } from 'react'
import type { Client, Flow, FlowQuestion } from '@/types'

export function FlowTab({ client, flow: initialFlow }: { client: Client; flow: Flow | null }) {
  const [flow, setFlow] = useState<Partial<Flow>>(
    initialFlow ?? {
      opening_message: '',
      questions: [],
      high_intent_triggers: [],
      high_intent_action: 'notify_owner',
      high_intent_message: '',
      standard_message: '',
      low_intent_message: '',
    }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [triggerInput, setTriggerInput] = useState('')

  function updateFlow(field: keyof Flow, value: unknown) {
    setFlow((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function addQuestion() {
    const questions = (flow.questions ?? []) as FlowQuestion[]
    const newQ: FlowQuestion = { id: Date.now(), message: '', field: 'question' + (questions.length + 1) }
    updateFlow('questions', [...questions, newQ])
  }

  function updateQuestion(idx: number, message: string) {
    const questions = [...((flow.questions ?? []) as FlowQuestion[])]
    questions[idx] = { ...questions[idx], message }
    updateFlow('questions', questions)
  }

  function removeQuestion(idx: number) {
    const questions = [...((flow.questions ?? []) as FlowQuestion[])]
    questions.splice(idx, 1)
    updateFlow('questions', questions)
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const questions = [...((flow.questions ?? []) as FlowQuestion[])]
    const target = idx + dir
    if (target < 0 || target >= questions.length) return
    ;[questions[idx], questions[target]] = [questions[target], questions[idx]]
    updateFlow('questions', questions)
  }

  function addTrigger() {
    const t = triggerInput.trim().toLowerCase()
    if (!t) return
    const triggers = (flow.high_intent_triggers ?? []) as string[]
    if (!triggers.includes(t)) {
      updateFlow('high_intent_triggers', [...triggers, t])
    }
    setTriggerInput('')
  }

  function removeTrigger(trigger: string) {
    const triggers = ((flow.high_intent_triggers ?? []) as string[]).filter((t) => t !== trigger)
    updateFlow('high_intent_triggers', triggers)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const url = initialFlow
      ? `/api/admin/clients/${client.id}/flow`
      : `/api/admin/clients/${client.id}/flow`

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flow),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save flow')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 max-w-2xl">
      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <Field label="Opening Message">
        <textarea
          value={flow.opening_message}
          onChange={(e) => updateFlow('opening_message', e.target.value)}
          rows={3}
          className={cls}
          placeholder="Use {business_name}, {owner_name}, {booking_link}"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Questions</label>
          <button
            onClick={addQuestion}
            className="text-xs text-blue-600 hover:underline"
          >
            + Add question
          </button>
        </div>
        <div className="space-y-2">
          {((flow.questions ?? []) as FlowQuestion[]).map((q, idx) => (
            <div key={q.id} className="flex gap-2 items-start">
              <div className="flex flex-col gap-1 pt-1">
                <button onClick={() => moveQuestion(idx, -1)} className="text-xs text-gray-400 hover:text-gray-600 leading-none">▲</button>
                <button onClick={() => moveQuestion(idx, 1)} className="text-xs text-gray-400 hover:text-gray-600 leading-none">▼</button>
              </div>
              <input
                value={q.message}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                placeholder={`Question ${idx + 1}`}
                className={`${cls} flex-1`}
              />
              <button
                onClick={() => removeQuestion(idx)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none pt-1.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">High Intent Triggers</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {((flow.high_intent_triggers ?? []) as string[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
              {t}
              <button onClick={() => removeTrigger(t)} className="hover:text-red-900 leading-none">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={triggerInput}
            onChange={(e) => setTriggerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
            placeholder="Type trigger and press Enter"
            className={`${cls} flex-1`}
          />
          <button onClick={addTrigger} className="text-sm text-blue-600 hover:underline whitespace-nowrap">Add</button>
        </div>
      </div>

      <Field label="High Intent Action">
        <select
          value={flow.high_intent_action}
          onChange={(e) => updateFlow('high_intent_action', e.target.value)}
          className={cls}
        >
          <option value="notify_owner">Notify owner</option>
          <option value="booking_link">Send booking link</option>
        </select>
      </Field>

      <Field label="High Intent Message">
        <textarea value={flow.high_intent_message} onChange={(e) => updateFlow('high_intent_message', e.target.value)} rows={2} className={cls} />
      </Field>

      <Field label="Standard Message (medium intent)">
        <textarea value={flow.standard_message} onChange={(e) => updateFlow('standard_message', e.target.value)} rows={2} className={cls} />
      </Field>

      <Field label="Low Intent Message">
        <textarea value={flow.low_intent_message} onChange={(e) => updateFlow('low_intent_message', e.target.value)} rows={2} className={cls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save flow'}
        </button>
        {saved && <p className="text-green-600 text-sm">Flow saved!</p>}
      </div>
    </div>
  )
}

const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
