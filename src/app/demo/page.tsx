'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type Stage = 'intro' | 'calling' | 'noanswer' | 'recents' | 'messages' | 'complete'
interface Msg { from: 'them' | 'me'; text: string }

/* ─── Data ───────────────────────────────────────────────────────────────────── */

const RECENTS = [
  { name: 'Riverside HVAC', time: 'just now', missed: true },
  { name: 'Mom',            time: '2m ago',   missed: false },
  { name: 'Dr. Martinez',   time: '1h ago',   missed: false },
  { name: 'Jake Wilson',    time: '3h ago',   missed: false },
]

const SCRIPT: { from: 'them' | 'me'; text: string }[] = [
  { from: 'them', text: 'Hi, sorry we missed your call at Riverside HVAC. Reply YES for a quick response. Reply STOP to opt out.' },
  { from: 'me',   text: 'YES' },
  { from: 'them', text: 'What type of service do you need?' },
  { from: 'me',   text: 'My AC stopped working' },
  { from: 'them', text: 'How urgent is this? Reply 1 for Emergency, 2 for This Week, or 3 for Just a Quote.' },
  { from: 'me',   text: '1' },
  { from: 'them', text: 'We are on it. Can you share your address so we can send a technician your way?' },
  { from: 'me',   text: '123 Oak Street' },
  { from: 'them', text: 'Perfect. A technician will be there within 30 minutes. Your appointment is confirmed.' },
]

/* ─── Cursor ─────────────────────────────────────────────────────────────────── */

function Cursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transition: 'left 1.4s cubic-bezier(0.4,0,0.2,1), top 1.4s cubic-bezier(0.4,0,0.2,1)',
      zIndex: 100, pointerEvents: 'none',
      transform: 'translate(-4px, -4px)',
    }}>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
        <path d="M3 1.5L19 12.5L11.5 14L8 23.5L3 1.5Z" fill="white" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      {clicking && (
        <div style={{
          position: 'absolute', top: -10, left: -10,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          animation: 'clickPulse 0.45s ease-out forwards',
        }} />
      )}
    </div>
  )
}

/* ─── Intro Screen ───────────────────────────────────────────────────────────── */

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1400)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      height: '100%',
      background: 'linear-gradient(160deg, #1B2A4A 0%, #0f1923 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 40px', gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#E0001B', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
          AutoReplyr Demo
        </p>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.5, marginBottom: 14 }}>
          See what happens<br />after a missed call.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.65 }}>
          Call a local HVAC company. They are busy on a job. Watch what happens next.
        </p>
      </div>

      <button
        onClick={onStart}
        style={{
          width: 76, height: 76, borderRadius: '50%',
          background: '#4CD964',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: pulse
            ? '0 0 0 16px rgba(76,217,100,0.12), 0 0 0 32px rgba(76,217,100,0.06)'
            : '0 0 0 8px rgba(76,217,100,0.15)',
          transition: 'box-shadow 0.7s ease, transform 0.15s',
          fontSize: 30,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        📞
      </button>

      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Tap to start</p>
    </div>
  )
}

/* ─── Call Screen ────────────────────────────────────────────────────────────── */

function CallScreen({ rings, noAnswer }: { rings: number; noAnswer: boolean }) {
  return (
    <div style={{
      height: '100%',
      background: 'linear-gradient(170deg, #1a1a2e 0%, #0f3460 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 90, position: 'relative',
    }}>
      {/* Ripple rings */}
      {rings > 0 && !noAnswer && [0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: 90 + 50 - (i * 20),
          left: '50%', transform: 'translateX(-50%)',
          width: 100 + i * 40, height: 100 + i * 40,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.15)',
          animation: `ringRipple 1.6s ease-out ${i * 0.35}s infinite`,
        }} />
      ))}

      {/* Avatar */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'linear-gradient(135deg, #E0001B, #a80014)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, fontWeight: 700, color: '#fff',
        boxShadow: '0 12px 40px rgba(224,0,27,0.35)',
        zIndex: 2, marginBottom: 24,
      }}>
        R
      </div>

      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 500, letterSpacing: 0.5, marginBottom: 8 }}>mobile</p>
      <h2 style={{ color: '#fff', fontSize: 30, fontWeight: 300, letterSpacing: -0.5, marginBottom: 10 }}>Riverside HVAC</h2>

      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 17 }}>
        {noAnswer ? 'Call Ended' : rings === 0 ? 'Calling…' : `Ringing… (${rings})`}
      </p>

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      {!noAnswer && (
        <div style={{ paddingBottom: 64, display: 'flex', gap: 44 }}>
          {[
            { icon: '🔇', label: 'mute' },
            { icon: '🔊', label: 'speaker' },
            { icon: '⌨️', label: 'keypad' },
          ].map(btn => (
            <div key={btn.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {btn.icon}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{btn.label}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ paddingBottom: noAnswer ? 80 : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: noAnswer ? 0 : 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: noAnswer ? 'rgba(255,255,255,0.15)' : '#FF3B30',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          {noAnswer ? '✓' : '📵'}
        </div>
        {!noAnswer && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>End</span>}
      </div>
    </div>
  )
}

/* ─── Recents Screen ─────────────────────────────────────────────────────────── */

function RecentsScreen() {
  return (
    <div style={{ height: '100%', background: '#f2f2f7', overflowY: 'auto' }}>
      <div style={{ padding: '62px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: '#000', letterSpacing: -0.5 }}>Recents</h1>
        <span style={{ color: '#007AFF', fontSize: 17 }}>Edit</span>
      </div>

      <div style={{ padding: '0 20px 16px', display: 'flex' }}>
        {['All', 'Missed'].map((t, i) => (
          <button key={t} style={{
            flex: 1, padding: '7px 0',
            background: i === 0 ? '#007AFF' : 'transparent',
            border: '1px solid #007AFF',
            borderRadius: i === 0 ? '8px 0 0 8px' : '0 8px 8px 0',
            color: i === 0 ? '#fff' : '#007AFF',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, margin: '0 16px', overflow: 'hidden' }}>
        {RECENTS.map((call, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            borderBottom: i < RECENTS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: call.missed ? 'rgba(224,0,27,0.1)' : '#e5e5ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, marginRight: 12, flexShrink: 0,
            }}>
              {call.missed ? '📵' : '📞'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: call.missed ? 600 : 400, color: call.missed ? '#E0001B' : '#000' }}>
                {call.name}
              </div>
              <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 1 }}>
                {call.missed ? 'Missed · ' : 'iPhone · '}{call.time}
              </div>
            </div>
            <span style={{ color: '#007AFF', fontSize: 20, marginLeft: 8 }}>ⓘ</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Messages Screen ────────────────────────────────────────────────────────── */

function MessagesScreen({
  messages, typing, scrollRef, complete,
}: {
  messages: Msg[]
  typing: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
  complete: boolean
}) {
  const bubble = (from: 'them' | 'me'): React.CSSProperties => ({
    maxWidth: '76%', padding: '10px 14px',
    borderRadius: from === 'me' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
    background: from === 'me' ? '#007AFF' : '#e8e8ed',
    color: from === 'me' ? '#fff' : '#000',
    fontSize: 15, lineHeight: 1.4,
  })

  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '54px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#f9f9f9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#007AFF', fontSize: 17 }}>‹</span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #E0001B, #a80014)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>R</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>Riverside HVAC</div>
              <div style={{ fontSize: 12, color: '#8e8e93' }}>Text Message</div>
            </div>
          </div>
          <span style={{ color: '#007AFF', fontSize: 22 }}>📞</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#8e8e93', background: '#f2f2f7', padding: '3px 12px', borderRadius: 12 }}>
            📞 Missed Call · just now
          </span>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={bubble(m.from)}>{m.text}</div>
          </div>
        ))}

        {typing && (
          <div style={{ display: 'flex' }}>
            <div style={{ ...bubble('them'), display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#999', animation: `typingDot 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {complete && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: 'rgba(76,217,100,0.1)', border: '1px solid rgba(76,217,100,0.3)',
              borderRadius: 16, padding: '16px 24px',
            }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1B2A4A' }}>Appointment Confirmed</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Lead captured while you were on the job.</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '8px 12px 20px', background: '#f9f9f9', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '9px 14px', fontSize: 15, color: '#aaa', border: '1px solid rgba(0,0,0,0.1)' }}>
          iMessage
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
          ↑
        </div>
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
  const [notif, setNotif] = useState(false)
  const [complete, setComplete] = useState(false)
  const [cursor, setCursor] = useState({ x: 195, y: 720, visible: false, clicking: false })
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  function schedule(fn: () => void, delay: number) {
    const t = setTimeout(fn, delay)
    timers.current.push(t)
  }

  function reset() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStage('intro')
    setRings(0)
    setMessages([])
    setTyping(false)
    setNotif(false)
    setComplete(false)
    setCursor({ x: 195, y: 720, visible: false, clicking: false })
  }

  function startDemo() {
    reset()
    // slight delay so reset clears first
    setTimeout(() => _run(), 50)
  }

  function _run() {
    // ── Calling ──────────────────────────────
    setStage('calling')
    schedule(() => setRings(1), 1000)
    schedule(() => setRings(2), 2600)
    schedule(() => setRings(3), 4200)

    // ── No answer ────────────────────────────
    schedule(() => setStage('noanswer'), 5800)

    // ── Recents ──────────────────────────────
    schedule(() => {
      setStage('recents')
      setCursor({ x: 195, y: 720, visible: true, clicking: false })
    }, 7200)

    // Cursor glides toward "Mom" row (~y 235)
    schedule(() => setCursor(c => ({ ...c, x: 180, y: 235 })), 8200)

    // Notification drops in
    schedule(() => setNotif(true), 10000)

    // Cursor pauses then redirects to notification
    schedule(() => setCursor(c => ({ ...c, x: 230, y: 88 })), 10900)

    // Cursor clicks
    schedule(() => setCursor(c => ({ ...c, clicking: true })), 12200)

    // Open messages
    schedule(() => {
      setNotif(false)
      setCursor(c => ({ ...c, visible: false, clicking: false }))
      setStage('messages')
    }, 12600)

    // ── Conversation ─────────────────────────
    let t = 13200
    SCRIPT.forEach(({ from, text }) => {
      if (from === 'them') {
        schedule(() => setTyping(true), t)
        schedule(() => {
          setTyping(false)
          setMessages(prev => [...prev, { from, text }])
        }, t + 900)
        t += 2600
      } else {
        schedule(() => setMessages(prev => [...prev, { from, text }]), t + 300)
        t += 1800
      }
    })

    // Complete
    schedule(() => setComplete(true), t + 600)
  }

  const isLight = stage === 'recents' || stage === 'messages'

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '16px 0',
    }}>
      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Home
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, letterSpacing: 2.5 }}>LIVE DEMO</span>
        {stage !== 'intro' ? (
          <button onClick={reset} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            Restart
          </button>
        ) : <div style={{ width: 56 }} />}
      </div>

      {/* Phone frame */}
      <div style={{
        width: 390, height: 790, borderRadius: 50,
        background: '#000',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 80px 160px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.04)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)',
          width: 118, height: 34, borderRadius: 20, background: '#000',
          zIndex: 30, border: '1px solid #111',
        }} />

        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 56,
          zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px 0',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? '#000' : '#fff', transition: 'color 0.4s' }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[3, 4, 5, 6].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, background: isLight ? '#000' : '#fff', borderRadius: 1, opacity: i === 3 ? 0.35 : 1, transition: 'background 0.4s' }} />
            ))}
            <div style={{ width: 22, height: 11, border: `1.5px solid ${isLight ? '#000' : '#fff'}`, borderRadius: 3, marginLeft: 4, position: 'relative', transition: 'border-color 0.4s' }}>
              <div style={{ position: 'absolute', left: 2, top: 1.5, width: 14, height: 5, background: isLight ? '#000' : '#fff', borderRadius: 1, transition: 'background 0.4s' }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {stage === 'intro'    && <IntroScreen onStart={startDemo} />}
          {(stage === 'calling' || stage === 'noanswer') && <CallScreen rings={rings} noAnswer={stage === 'noanswer'} />}
          {stage === 'recents'  && <RecentsScreen />}
          {stage === 'messages' && <MessagesScreen messages={messages} typing={typing} scrollRef={scrollRef} complete={complete} />}
        </div>

        {/* Notification banner */}
        <div style={{
          position: 'absolute',
          top: notif ? 62 : -130,
          left: 12, right: 12,
          background: 'rgba(28,28,30,0.96)',
          backdropFilter: 'blur(24px)',
          borderRadius: 16, padding: '14px 16px',
          zIndex: 50,
          transition: 'top 0.55s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#E0001B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
            💬
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Messages</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>now</span>
            </div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Riverside HVAC</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Sorry we missed your call. Reply YES for a quick response.
            </div>
          </div>
        </div>

        {/* Animated cursor */}
        {cursor.visible && <Cursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} />}
      </div>

      {/* Caption below phone */}
      <div style={{ marginTop: 28, textAlign: 'center', maxWidth: 320 }}>
        {stage === 'intro' && (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, lineHeight: 1.6 }}>
            A real scenario — automated from the first missed call to a confirmed appointment.
          </p>
        )}
        {(stage === 'calling' || stage === 'noanswer') && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
            📞 Calling Riverside HVAC… no answer.
          </p>
        )}
        {stage === 'recents' && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
            About to try the next number…
          </p>
        )}
        {(stage === 'messages' || stage === 'complete') && !complete && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
            AutoReplyr already texted back. Watch it qualify the lead.
          </p>
        )}
        {complete && (
          <p style={{ color: 'rgba(76,217,100,0.7)', fontSize: 13, fontWeight: 500 }}>
            Lead captured and appointment booked — automatically.
          </p>
        )}
      </div>

      <style>{`
        @keyframes ringRipple {
          0%   { transform: translateX(-50%) scale(1); opacity: 0.5; }
          100% { transform: translateX(-50%) scale(2.6); opacity: 0; }
        }
        @keyframes clickPulse {
          0%   { transform: scale(0.4); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%           { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
