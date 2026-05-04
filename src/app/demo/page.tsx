'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type Stage = 'intro' | 'calling' | 'noanswer' | 'recents' | 'messages'
interface Msg { from: 'them' | 'me'; text: string }
interface Option { label: string; text: string; end?: boolean }
interface FlowStep { them: string; options: Option[] | null }

/* ─── Conversation flow ──────────────────────────────────────────────────────── */

const FLOW: FlowStep[] = [
  {
    them: 'Hi, sorry we missed your call at Riverside HVAC. Reply YES for a quick response. Reply STOP to opt out.',
    options: [
      { label: 'YES',  text: 'YES' },
      { label: 'STOP', text: 'STOP', end: true },
    ],
  },
  {
    them: 'What type of service do you need?',
    options: [
      { label: 'AC repair',    text: 'My AC stopped working' },
      { label: 'Heating issue', text: 'My heater stopped working' },
      { label: 'New system quote', text: 'I need a quote for a new system' },
    ],
  },
  {
    them: 'How urgent is this for you?',
    options: [
      { label: 'Emergency, need same day', text: 'Emergency' },
      { label: 'This week works',          text: 'This week' },
      { label: 'Just getting a quote',     text: 'Just a quote' },
    ],
  },
  {
    them: 'Got it. Can you share your address so we can send a technician your way?',
    options: [
      { label: '123 Oak Street', text: '123 Oak Street' },
    ],
  },
  {
    them: 'Perfect. A technician will be there within 30 minutes. Your appointment is confirmed.',
    options: null,
  },
]


/* ─── Cursor ─────────────────────────────────────────────────────────────────── */

function Cursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transition: 'left 1.5s cubic-bezier(0.4,0,0.2,1), top 1.5s cubic-bezier(0.4,0,0.2,1)',
      zIndex: 100, pointerEvents: 'none',
      transform: 'translate(-4px, -4px)',
    }}>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        <path d="M3 1.5L19 12.5L11.5 14L8 23.5L3 1.5Z" fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      {clicking && (
        <div style={{ position: 'absolute', top: -10, left: -10, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: 'clickPulse 0.45s ease-out forwards' }} />
      )}
    </div>
  )
}

/* ─── Intro Screen ───────────────────────────────────────────────────────────── */

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [pulse, setPulse] = useState(false)
  useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1400); return () => clearInterval(t) }, [])
  return (
    <div style={{ height: '100%', background: 'linear-gradient(160deg, #1B2A4A 0%, #0f1923 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', gap: 28 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#E0001B', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18 }}>AutoReplyr Demo</p>
        <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.5, marginBottom: 12 }}>
          See what happens after<br />a missed call.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.65 }}>
          Call a local HVAC company. They are busy on a job. Watch AutoReplyr take over — then take part in the conversation.
        </p>
      </div>
      <button onClick={onStart} style={{ width: 72, height: 72, borderRadius: '50%', background: '#4CD964', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: pulse ? '0 0 0 16px rgba(76,217,100,0.12), 0 0 0 32px rgba(76,217,100,0.05)' : '0 0 0 8px rgba(76,217,100,0.12)', transition: 'box-shadow 0.7s ease, transform 0.15s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
        📞
      </button>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Tap to call</p>
    </div>
  )
}

/* ─── Call Screen ────────────────────────────────────────────────────────────── */

function CallScreen({ rings, noAnswer }: { rings: number; noAnswer: boolean }) {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(170deg, #1a1a2e 0%, #0f3460 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, position: 'relative' }}>
      {rings > 0 && !noAnswer && [0, 1].map(i => (
        <div key={i} style={{ position: 'absolute', top: 80 + 50 - i * 18, left: '50%', transform: 'translateX(-50%)', width: 100 + i * 44, height: 100 + i * 44, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)', animation: `ringRipple 1.6s ease-out ${i * 0.38}s infinite` }} />
      ))}
      <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #E0001B, #a80014)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 700, color: '#fff', boxShadow: '0 12px 40px rgba(224,0,27,0.35)', zIndex: 2, marginBottom: 22 }}>R</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 6 }}>mobile</p>
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 300, letterSpacing: -0.5, marginBottom: 10 }}>Riverside HVAC</h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16 }}>
        {noAnswer ? 'Call Ended' : rings === 0 ? 'Calling…' : `Ringing… (${rings})`}
      </p>
      <div style={{ flex: 1 }} />
      {!noAnswer && (
        <div style={{ paddingBottom: 56, display: 'flex', gap: 40 }}>
          {[{ icon: '🔇', label: 'mute' }, { icon: '🔊', label: 'speaker' }, { icon: '⌨️', label: 'keypad' }].map(b => (
            <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{b.icon}</div>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{b.label}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ paddingBottom: noAnswer ? 72 : 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: noAnswer ? 'rgba(255,255,255,0.12)' : '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          {noAnswer ? '✓' : '📵'}
        </div>
        {!noAnswer && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>End</span>}
      </div>
    </div>
  )
}

/* ─── Search Screen ──────────────────────────────────────────────────────────── */

const COMPETITORS = [
  { name: 'Cool Breeze HVAC',    stars: 4.2, reviews: 89,  phone: '(555) 448-3291', tag: 'Open · Local business' },
  { name: 'Apex Air & Heat',     stars: 4.6, reviews: 212, phone: '(555) 771-8842', tag: 'Open · Highly rated' },
  { name: 'TempRight Services',  stars: 3.9, reviews: 41,  phone: '(555) 229-1073', tag: 'Closes at 5pm' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f5a623', fontSize: 11 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

function SearchScreen() {
  return (
    <div style={{ height: '100%', background: '#fff', overflowY: 'auto' }}>
      {/* Browser chrome */}
      <div style={{ background: '#f1f3f4', paddingTop: 54, paddingBottom: 10, paddingLeft: 12, paddingRight: 12, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9aa0a6" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 12, color: '#202124', flex: 1 }}>HVAC companies in my area</span>
          <span style={{ fontSize: 13, color: '#70757a' }}>✕</span>
        </div>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 10, color: '#70757a', marginBottom: 12 }}>About 2,430,000 results (0.48 seconds)</p>

        {/* Local pack */}
        <div style={{ border: '1px solid #dfe1e5', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          {/* Fake map */}
          <div style={{ height: 82, background: 'linear-gradient(135deg, #e8f0e8, #c8dfc8)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 17px,rgba(0,0,0,0.04) 17px,rgba(0,0,0,0.04) 18px),repeating-linear-gradient(90deg,transparent,transparent 17px,rgba(0,0,0,0.04) 17px,rgba(0,0,0,0.04) 18px)' }} />
            {[{ x: 28, y: 38 }, { x: 54, y: 52 }, { x: 72, y: 25 }].map((p, i) => (
              <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: 20, height: 20, borderRadius: '50% 50% 50% 0', background: i === 0 ? '#E0001B' : '#1a73e8', transform: 'rotate(-45deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ transform: 'rotate(45deg)', color: '#fff', fontSize: 8, fontWeight: 700 }}>{i + 1}</span>
              </div>
            ))}
          </div>

          {COMPETITORS.map((biz, i) => (
            <div key={i} style={{ padding: '9px 12px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: '0 0 2px' }}>{i + 1}. {biz.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#202124' }}>{biz.stars}</span>
                    <Stars rating={biz.stars} />
                    <span style={{ fontSize: 10, color: '#70757a' }}>({biz.reviews})</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#70757a', margin: 0 }}>{biz.tag}</p>
                </div>
                <div style={{ fontSize: 11, color: '#1a73e8', background: '#e8f0fe', padding: '5px 9px', borderRadius: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {biz.phone}
                </div>
              </div>
            </div>
          ))}

          <div style={{ padding: '9px 12px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#1a73e8', fontWeight: 500 }}>More HVAC businesses ›</span>
          </div>
        </div>

        {/* Organic results */}
        {[
          { url: 'bestHVACreviews.com › top-hvac-near-you', title: 'Top 10 HVAC Companies Near You – 2024 Reviews', desc: 'Compare local HVAC contractors. Read verified reviews and get free quotes from trusted pros…' },
          { url: 'yelp.com › search › hvac-near-me', title: 'Best HVAC Near Me – Yelp', desc: 'Find top-rated HVAC companies. Read reviews from real customers and contact businesses directly…' },
        ].map((r, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, color: '#202124', margin: '0 0 1px' }}>{r.url}</p>
            <p style={{ fontSize: 13, color: '#1a0dab', margin: '0 0 2px', fontWeight: 500 }}>{r.title}</p>
            <p style={{ fontSize: 11, color: '#4d5156', margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Messages Screen ────────────────────────────────────────────────────────── */

function MessagesScreen({
  messages, typing, options, onPick, complete, scrollRef,
}: {
  messages: Msg[]
  typing: boolean
  options: Option[] | null
  onPick: (opt: Option) => void
  complete: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const bubble = (from: 'them' | 'me'): React.CSSProperties => ({
    maxWidth: '76%', padding: '9px 13px',
    borderRadius: from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: from === 'me' ? '#007AFF' : '#e8e8ed',
    color: from === 'me' ? '#fff' : '#000',
    fontSize: 14, lineHeight: 1.4,
  })

  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#f9f9f9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#007AFF', fontSize: 16 }}>‹</span>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #E0001B, #a80014)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#000' }}>Riverside HVAC</div>
            <div style={{ fontSize: 11, color: '#8e8e93' }}>{typing ? 'typing…' : 'Text Message'}</div>
          </div>
          <span style={{ color: '#007AFF', fontSize: 20 }}>📞</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#8e8e93', background: '#f2f2f7', padding: '3px 10px', borderRadius: 10 }}>📞 Missed Call · just now</span>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={bubble(m.from)}>{m.text}</div>
          </div>
        ))}

        {typing && (
          <div style={{ display: 'flex' }}>
            <div style={{ ...bubble('them'), display: 'flex', gap: 4, alignItems: 'center', padding: '11px 14px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', animation: `typingDot 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        {/* Interactive options */}
        {options && !typing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
            {options.map((opt, i) => (
              <button key={i} onClick={() => onPick(opt)} style={{ background: '#fff', border: '1.5px solid rgba(0,122,255,0.35)', borderRadius: 18, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#007AFF', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,122,255,0.06)'; e.currentTarget.style.borderColor = '#007AFF' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(0,122,255,0.35)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {complete && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'rgba(76,217,100,0.08)', border: '1px solid rgba(76,217,100,0.25)', borderRadius: 14, padding: '14px 20px' }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2A4A' }}>Appointment Confirmed</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Lead captured while you were on the job.</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '7px 10px 18px', background: '#f9f9f9', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: '8px 12px', fontSize: 14, color: '#aaa', border: '1px solid rgba(0,0,0,0.1)' }}>iMessage</div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>↑</div>
      </div>
    </div>
  )
}

/* ─── Demo Page ──────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [stage, setStage] = useState<Stage>('intro')
  const [rings, setRings] = useState(0)
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [options, setOptions] = useState<Option[] | null>(null)
  const [complete, setComplete] = useState(false)
  const [flowStep, setFlowStep] = useState(0)
  const [notif, setNotif] = useState(false)
  const [cursor, setCursor] = useState({ x: 195, y: 720, visible: false, clicking: false })
  const [phoneScale, setPhoneScale] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const PHONE_H = 790

  // Scale phone to fit viewport
  useEffect(() => {
    const update = () => {
      const available = window.innerHeight - 100 // reserve space for top bar + caption
      setPhoneScale(Math.min(1, available / PHONE_H))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing, options])

  function schedule(fn: () => void, delay: number) {
    const t = setTimeout(fn, delay)
    timers.current.push(t)
  }

  function reset() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStage('intro'); setRings(0); setMessages([]); setTyping(false)
    setOptions(null); setComplete(false); setFlowStep(0); setNotif(false)
    setCursor({ x: 195, y: 720, visible: false, clicking: false })
  }

  // Show a flow step's "them" message, then show its options
  const advanceFlow = useCallback((step: number, msgs: Msg[]) => {
    if (step >= FLOW.length) return
    const { them, options: opts } = FLOW[step]
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages([...msgs, { from: 'them', text: them }])
      setTimeout(() => setOptions(opts), opts ? 400 : 0)
      if (!opts) setTimeout(() => setComplete(true), 600)
    }, 900)
  }, [])

  function pickOption(opt: Option) {
    setOptions(null)
    const next = [...messages, { from: 'me' as const, text: opt.text }]
    setMessages(next)

    if (opt.end) {
      setTimeout(() => {
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          setMessages([...next, { from: 'them', text: 'No problem. You have been opted out. Have a great day.' }])
          setTimeout(() => setComplete(true), 400)
        }, 900)
      }, 400)
      return
    }

    const nextStep = flowStep + 1
    setFlowStep(nextStep)
    setTimeout(() => advanceFlow(nextStep, next), 400)
  }

  function startDemo() {
    reset()
    setTimeout(() => {
      setStage('calling')
      schedule(() => setRings(1), 1000)
      schedule(() => setRings(2), 2600)
      schedule(() => setRings(3), 4200)
      schedule(() => setStage('noanswer'), 5800)
      schedule(() => {
        setStage('recents')
        setCursor({ x: 195, y: 720, visible: true, clicking: false })
      }, 7200)
      schedule(() => setCursor(c => ({ ...c, x: 310, y: 272 })), 8200)
      schedule(() => setNotif(true), 10000)
      schedule(() => setCursor(c => ({ ...c, x: 228, y: 86 })), 10900)
      schedule(() => setCursor(c => ({ ...c, clicking: true })), 12200)
      schedule(() => {
        setNotif(false)
        setCursor(c => ({ ...c, visible: false, clicking: false }))
        setStage('messages')
        // Kick off first flow step
        setTimeout(() => advanceFlow(0, []), 500)
      }, 12600)
    }, 50)
  }

  const isLight = stage === 'recents' || stage === 'messages'

  // Caption text
  const caption =
    stage === 'intro'                     ? 'A real scenario — automated from the first missed call to a booked appointment.' :
    stage === 'calling'                   ? '📞 Calling Riverside HVAC…' :
    stage === 'noanswer'                  ? 'No answer. Now searching for a competitor…' :
    stage === 'recents'                   ? 'About to call a competitor…' :
    complete                              ? '🎉 Lead captured and appointment booked automatically.' :
    options                               ? 'Your turn — pick a reply.' :
    'AutoReplyr is responding…'

  return (
    <div style={{
      height: '100vh', background: '#0a0f1a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      paddingTop: 12,
    }}>
      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5 }}>LIVE DEMO</span>
        {stage !== 'intro'
          ? <button onClick={reset} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Restart</button>
          : <div style={{ width: 52 }} />}
      </div>

      {/* Phone — scaled to fit */}
      <div style={{ width: 390 * phoneScale, height: PHONE_H * phoneScale, position: 'relative', flexShrink: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 390, height: PHONE_H,
          transform: `scale(${phoneScale})`, transformOrigin: 'top left',
          borderRadius: 50, background: '#000',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 60px 120px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}>
          {/* Dynamic island */}
          <div style={{ position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)', width: 118, height: 34, borderRadius: 20, background: '#000', zIndex: 30, border: '1px solid #111' }} />

          {/* Status bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 0' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? '#000' : '#fff', transition: 'color 0.4s' }}>9:41</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {[3, 4, 5, 6].map((h, i) => <div key={i} style={{ width: 3, height: h, background: isLight ? '#000' : '#fff', borderRadius: 1, opacity: i === 3 ? 0.35 : 1, transition: 'background 0.4s' }} />)}
              <div style={{ width: 22, height: 11, border: `1.5px solid ${isLight ? '#000' : '#fff'}`, borderRadius: 3, marginLeft: 4, position: 'relative', transition: 'border-color 0.4s' }}>
                <div style={{ position: 'absolute', left: 2, top: 1.5, width: 14, height: 5, background: isLight ? '#000' : '#fff', borderRadius: 1, transition: 'background 0.4s' }} />
              </div>
            </div>
          </div>

          {/* Screen */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {stage === 'intro'   && <IntroScreen onStart={startDemo} />}
            {(stage === 'calling' || stage === 'noanswer') && <CallScreen rings={rings} noAnswer={stage === 'noanswer'} />}
            {stage === 'recents' && <SearchScreen />}
            {stage === 'messages' && <MessagesScreen messages={messages} typing={typing} options={options} onPick={pickOption} complete={complete} scrollRef={scrollRef} />}
          </div>

          {/* Notification */}
          <div style={{ position: 'absolute', top: notif ? 62 : -130, left: 12, right: 12, background: 'rgba(28,28,30,0.96)', backdropFilter: 'blur(24px)', borderRadius: 16, padding: '13px 15px', zIndex: 50, transition: 'top 0.55s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E0001B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>💬</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Messages</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>now</span>
              </div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 1 }}>Riverside HVAC</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Sorry we missed your call. Reply YES for a quick response.
              </div>
            </div>
          </div>

          {cursor.visible && <Cursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} />}
        </div>
      </div>

      {/* Caption */}
      <p style={{ marginTop: 20, color: complete ? 'rgba(76,217,100,0.7)' : options ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.5, transition: 'color 0.4s', flexShrink: 0, padding: '0 20px' }}>
        {caption}
      </p>

      <style>{`
        @keyframes ringRipple { 0% { transform: translateX(-50%) scale(1); opacity: 0.5; } 100% { transform: translateX(-50%) scale(2.8); opacity: 0; } }
        @keyframes clickPulse { 0% { transform: scale(0.4); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
      `}</style>
    </div>
  )
}
