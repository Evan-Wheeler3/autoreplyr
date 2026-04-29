export type ClientStatus = 'active' | 'inactive'
export type LeadStatus = 'new' | 'in_progress' | 'qualified' | 'booked' | 'lost'
export type IntentLevel = 'high' | 'medium' | 'low'
export type MessageDirection = 'inbound' | 'outbound'
export type HighIntentAction = 'notify_owner' | 'booking_link'
export type Industry = 'hvac' | 'plumbing' | 'roofing' | 'electrician' | 'pest_control'

export interface Client {
  id: string
  business_name: string
  owner_name: string
  owner_email: string
  owner_notify_number: string
  twilio_number: string
  industry: string
  booking_link: string | null
  status: ClientStatus
  created_at: string
}

export interface FlowQuestion {
  id: number
  message: string
  field: string
}

export interface Flow {
  id: string
  client_id: string
  opening_message: string
  questions: FlowQuestion[]
  high_intent_triggers: string[]
  high_intent_action: HighIntentAction
  high_intent_message: string
  standard_message: string
  low_intent_message: string
  updated_at: string
}

export interface TranscriptEntry {
  direction: MessageDirection
  body: string
  sent_at: string
}

export interface Lead {
  id: string
  client_id: string
  caller_number: string
  started_at: string
  completed_at: string | null
  status: LeadStatus
  intent_level: IntentLevel | null
  current_question_index: number
  transcript: TranscriptEntry[]
}

export interface Message {
  id: string
  lead_id: string
  client_id: string
  direction: MessageDirection
  body: string
  sent_at: string
}

export interface ClientUser {
  id: string
  client_id: string
  user_id: string
}

export interface AppError {
  id: string
  client_id: string | null
  lead_id: string | null
  context: string | null
  error_message: string | null
  occurred_at: string
}
