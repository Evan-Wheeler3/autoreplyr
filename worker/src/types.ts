export interface Env {
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export interface Client {
  id: string
  business_name: string
  owner_name: string
  owner_notify_number: string
  booking_link: string | null
  status: 'active' | 'inactive'
}

export interface Flow {
  id: string
  client_id: string
  opening_message: string
  questions: Array<{ id: number; message: string; field: string }>
  high_intent_triggers: string[]
  high_intent_action: 'notify_owner' | 'booking_link'
  high_intent_message: string
  standard_message: string
  low_intent_message: string
}

export interface Lead {
  id: string
  client_id: string
  caller_number: string
  status: string
  intent_level: string | null
  current_question_index: number
  transcript: Array<{ direction: string; body: string; sent_at: string }>
}
