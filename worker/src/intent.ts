export function scoreIntent(
  transcript: Array<{ direction: string; body: string }>,
  triggers: string[]
): 'high' | 'medium' | 'low' {
  const inboundText = transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body.toLowerCase())
    .join(' ')

  const lowTriggers = triggers.map((t) => t.toLowerCase())
  const hasHighTrigger = lowTriggers.some((trigger) => inboundText.includes(trigger))

  if (hasHighTrigger) return 'high'

  // Substantive if total inbound words > 10 and avg reply length > 3 chars
  const inboundMessages = transcript.filter((m) => m.direction === 'inbound')
  const totalWords = inboundText.split(/\s+/).filter(Boolean).length
  const avgLen =
    inboundMessages.length > 0
      ? inboundMessages.reduce((s, m) => s + m.body.length, 0) / inboundMessages.length
      : 0

  if (totalWords > 5 && avgLen > 8) return 'medium'

  return 'low'
}

export function buildSummary(
  transcript: Array<{ direction: string; body: string }>
): string {
  return transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body)
    .join('; ')
    .slice(0, 200)
}
