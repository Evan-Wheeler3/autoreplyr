import type { Industry } from '@/types'

interface FlowTemplate {
  opening_message: string
  questions: Array<{ id: number; message: string; field: string }>
  high_intent_triggers: string[]
  high_intent_action: 'notify_owner' | 'booking_link'
  high_intent_message: string
  standard_message: string
  low_intent_message: string
}

export const INDUSTRY_TEMPLATES: Record<Industry, FlowTemplate> = {
  hvac: {
    opening_message:
      "Hi, sorry we missed your call at {business_name}. What's going on with your HVAC system today?",
    questions: [
      { id: 1, message: "What's your address or general area?", field: 'location' },
      {
        id: 2,
        message: "How urgent is this? (No heat/AC right now / Not working well / Just need a quote)",
        field: 'urgency',
      },
    ],
    high_intent_triggers: [
      'no heat',
      'no ac',
      'not cooling',
      'not heating',
      'emergency',
      'today',
      'asap',
      'urgent',
    ],
    high_intent_action: 'notify_owner',
    high_intent_message:
      "Got it — this sounds urgent. {owner_name} will call you back within 15 minutes.",
    standard_message:
      "Thanks for the info. Here's a link to book a time that works: {booking_link}",
    low_intent_message: "Thanks for reaching out. We'll be in touch soon.",
  },
  plumbing: {
    opening_message:
      "Hi, sorry we missed your call at {business_name}. What plumbing issue can we help with?",
    questions: [
      { id: 1, message: "What's your address or general area?", field: 'location' },
      {
        id: 2,
        message: "How urgent is this? (Active leak or emergency / Need it fixed soon / Getting quotes)",
        field: 'urgency',
      },
    ],
    high_intent_triggers: [
      'flooding',
      'burst',
      'leak',
      'no water',
      'emergency',
      'sewage',
      'overflow',
      'today',
      'urgent',
      'asap',
    ],
    high_intent_action: 'notify_owner',
    high_intent_message:
      "Got it — this sounds urgent. {owner_name} will call you back within 15 minutes.",
    standard_message:
      "Thanks for the info. Here's a link to book a time that works: {booking_link}",
    low_intent_message: "Thanks for reaching out. We'll be in touch soon.",
  },
  roofing: {
    opening_message:
      "Hi, sorry we missed your call at {business_name}. What's going on with your roof?",
    questions: [
      { id: 1, message: "What's your address or general area?", field: 'location' },
      {
        id: 2,
        message: "Is there active damage or leaking right now, or is this for an inspection or quote?",
        field: 'urgency',
      },
    ],
    high_intent_triggers: [
      'leaking',
      'leak',
      'damage',
      'storm',
      'emergency',
      'water coming in',
      'today',
      'urgent',
      'asap',
    ],
    high_intent_action: 'notify_owner',
    high_intent_message:
      "Got it — this sounds urgent. {owner_name} will call you back within 15 minutes.",
    standard_message:
      "Thanks for the info. Here's a link to book a time that works: {booking_link}",
    low_intent_message: "Thanks for reaching out. We'll be in touch soon.",
  },
  electrician: {
    opening_message:
      "Hi, sorry we missed your call at {business_name}. What electrical issue can we help with?",
    questions: [
      { id: 1, message: "What's your address or general area?", field: 'location' },
      {
        id: 2,
        message:
          "How urgent is this? (No power / Safety concern / Need work done / Just a quote)",
        field: 'urgency',
      },
    ],
    high_intent_triggers: [
      'no power',
      'sparking',
      'burning smell',
      'fire',
      'emergency',
      'outage',
      'today',
      'asap',
      'urgent',
    ],
    high_intent_action: 'notify_owner',
    high_intent_message:
      "Got it — this sounds urgent. {owner_name} will call you back within 15 minutes.",
    standard_message:
      "Thanks for the info. Here's a link to book a time that works: {booking_link}",
    low_intent_message: "Thanks for reaching out. We'll be in touch soon.",
  },
  pest_control: {
    opening_message:
      "Hi, sorry we missed your call at {business_name}. What pest issue are you dealing with?",
    questions: [
      { id: 1, message: "What's your address or general area?", field: 'location' },
      {
        id: 2,
        message: "What type of pest and how bad is the problem?",
        field: 'urgency',
      },
    ],
    high_intent_triggers: [
      'infestation',
      'emergency',
      'rats',
      'mice',
      'wasps',
      'bees',
      'today',
      'asap',
      'urgent',
    ],
    high_intent_action: 'notify_owner',
    high_intent_message:
      "Got it — this sounds urgent. {owner_name} will call you back within 15 minutes.",
    standard_message:
      "Thanks for the info. Here's a link to book a time that works: {booking_link}",
    low_intent_message: "Thanks for reaching out. We'll be in touch soon.",
  },
}

export function getTemplate(industry: Industry): FlowTemplate {
  return INDUSTRY_TEMPLATES[industry]
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  hvac: 'HVAC',
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  electrician: 'Electrician',
  pest_control: 'Pest Control',
}
