'use client'

import { useEffect, useRef, useState, RefObject } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/* ─── Hooks ─────────────────────────────────────────────────────────────────── */

function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrollY
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useCounter(end: number, duration = 2200, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let t: number | null = null
    const step = (ts: number) => {
      if (!t) t = ts
      const p = Math.min((ts - t) / duration, 1)
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * end))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, end, duration])
  return count
}

function useSectionProgress(ref: RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      setProgress(Math.max(0, Math.min(1, -rect.top / total)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref])
  return progress
}

/* ─── Phone Mockup ──────────────────────────────────────────────────────────── */

const PREVIEW = [
  { from: 'them' as const, text: 'Hi, sorry we missed your call at Riverside HVAC. Reply YES for a quick response. Reply STOP to opt out.', delay: 300 },
  { from: 'me'   as const, text: 'YES', delay: 1100 },
  { from: 'them' as const, text: 'What type of service do you need?', delay: 1800 },
]

interface ChatMsg { from: 'them' | 'me'; text: string }
interface Option { label: string; response: string; next?: Option[] }

const FLOW: Option[] = [
  {
    label: 'Repair / Emergency',
    response: "Got it, we are treating this as urgent. A technician will be reaching out to you within the next 30 minutes. Can you share your address so we can get someone headed your way?",
  },
  {
    label: 'Get a quote',
    response: "No problem at all. You can get an instant quote right here: riverside-hvac.com/quote. Someone will also follow up to answer any questions.",
  },
  {
    label: 'Schedule a visit',
    response: "Sounds great. You can pick a time that works for you right here: calendly.com/riverside-hvac. We look forward to seeing you.",
  },
]

function PhoneMockup({ className = '' }: { className?: string }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [options, setOptions] = useState<Option[] | null>(null)
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timers = PREVIEW.map((msg, i) =>
      setTimeout(() => setVisibleCount(v => Math.max(v, i + 1)), msg.delay)
    )
    const showOptions = setTimeout(() => setOptions(FLOW), PREVIEW[PREVIEW.length - 1].delay + 800)
    return () => { timers.forEach(clearTimeout); clearTimeout(showOptions) }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visibleCount, messages, typing])

  function pick(opt: Option) {
    setOptions(null)
    setMessages(prev => [...prev, { from: 'me', text: opt.label }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { from: 'them', text: opt.response }])
      if (opt.next) setTimeout(() => setOptions(opt.next!), 400)
    }, 900 + Math.random() * 500)
  }

  const bubble = (from: 'them' | 'me') => ({
    maxWidth: '78%', padding: '8px 12px',
    borderRadius: from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: from === 'me' ? '#1B2A4A' : '#f2f2f7',
    color: from === 'me' ? '#fff' : '#000',
    fontSize: 13, lineHeight: 1.4, letterSpacing: -0.1,
  })

  return (
    <div
      className={className}
      style={{
        width: 300, height: 580, borderRadius: 44, background: '#fff',
        boxShadow: '0 50px 100px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.8)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}
    >
      {/* Status bar */}
      <div style={{ background: '#f2f2f7', padding: '14px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#000', letterSpacing: -0.3 }}>9:41</span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ width: 3, height: 4 + i * 2, background: '#000', borderRadius: 1, opacity: i === 3 ? 0.3 : 1 }} />
          ))}
          <div style={{ width: 15, height: 8, border: '1.5px solid #000', borderRadius: 2, marginLeft: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 1, top: 1, right: 1, bottom: 1, background: '#000', borderRadius: 1 }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: '#f2f2f7', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1B2A4A, #2d4a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>A</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#000', letterSpacing: -0.2 }}>AutoReplyr</div>
          <div style={{ fontSize: 11, color: '#888' }}>{typing ? 'Typing…' : 'Text Message'}</div>
        </div>
      </div>

      {/* Messages — scroll contained, no page interference */}
      <div
        ref={scrollRef}
        onWheel={e => e.stopPropagation()}
        style={{ flex: 1, background: '#fff', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#999', background: '#f2f2f7', padding: '3px 10px', borderRadius: 10 }}>
            📞 Missed Call · just now
          </span>
        </div>

        {PREVIEW.slice(0, visibleCount).map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={bubble(msg.from)}>{msg.text}</div>
          </div>
        ))}

        {messages.map((msg, i) => (
          <div key={`m${i}`} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={bubble(msg.from)}>{msg.text}</div>
          </div>
        ))}

        {typing && (
          <div style={{ display: 'flex' }}>
            <div style={{ ...bubble('them'), display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', animation: `typingDot 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {options && !typing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => pick(opt)}
                style={{
                  background: '#fff', border: '1.5px solid rgba(27,42,74,0.25)', borderRadius: 18,
                  padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#1B2A4A',
                  cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,42,74,0.06)'; e.currentTarget.style.borderColor = 'rgba(27,42,74,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(27,42,74,0.25)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar — always static */}
      <div style={{ background: '#f2f2f7', padding: '8px 12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '8px 14px', fontSize: 13, color: '#aaa', border: '1px solid rgba(0,0,0,0.1)' }}>
          iMessage
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6 L11 6 M7 2 L11 6 L7 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */

function Navbar() {
  const scrollY = useScrollY()
  const scrolled = scrollY > 40

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(20px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.07)' : 'none',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="AutoReplyr" width={32} height={32} className="object-contain"
          style={{ background: 'white', borderRadius: 6 }} />
        <span className="font-bold text-lg tracking-tight" style={{ color: '#1B2A4A' }}>
          AutoReplyr
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-6">
        {[
          { label: 'How it Works', id: 'how-it-works' },
          { label: 'Use Cases',    id: 'use-cases' },
        ].map(({ label, id }) => (
          <button
            key={id}
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: scrolled ? '#475569' : '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm font-bold px-4 py-2 rounded-full transition-all duration-200"
          style={{ background: '#E0001B', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 10px rgba(224,0,27,0.3)' }}
        >
          Join!
        </button>
      </div>
    </nav>
  )
}


/* ─── Hero ──────────────────────────────────────────────────────────────────── */

function Hero() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const scrollY = useScrollY()

  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Top-right navy accent */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(27,42,74,0.10) 0%, transparent 65%)',
          top: -200, right: -200,
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      />

      {/* Bottom-left red accent */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,0,27,0.12) 0%, transparent 65%)',
          bottom: -100, left: -100,
          transform: `translateY(${scrollY * -0.08}px)`,
        }}
      />

      {/* Ghosted logo background with parallax */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '60vmin',
          height: '60vmin',
          maxWidth: 580,
          maxHeight: 580,
          transform: `translate(-50%, calc(-50% + ${scrollY * 0.2}px))`,
          opacity: 0.12,
        }}
      >
        <Image src="/logo.png" alt="" fill className="object-contain" sizes="60vmin" priority />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-6 items-center min-h-[80vh]">

          {/* Left */}
          <div className="flex flex-col">
            {/* Badge */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
              className="mb-8"
            >
              <span
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full"
                style={{ color: '#E0001B', background: 'rgba(224,0,27,0.06)', border: '1px solid rgba(224,0,27,0.15)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                Missed Call Recovery
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-bold leading-none tracking-tight mb-6"
              style={{
                fontSize: 'clamp(48px, 6vw, 88px)',
                color: '#0f1923',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(28px)',
                transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
              }}
            >
              Missed Calls<br />
              Shouldn&apos;t Mean<br />
              <span style={{ color: '#E0001B' }}>Lost Revenue.</span>
            </h1>

            {/* Sub */}
            <p
              className="text-lg leading-relaxed mb-10 max-w-md"
              style={{
                color: '#64748b',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease 0.22s, transform 0.7s ease 0.22s',
              }}
            >
              AutoReplyr texts your missed callers back in seconds. Qualifying leads while you&apos;re on the job.
            </p>

            {/* Form */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease 0.34s, transform 0.7s ease 0.34s',
              }}
            >
              {submitted ? (
                <div
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl font-medium"
                  style={{ background: 'rgba(224,0,27,0.06)', border: '1px solid rgba(224,0,27,0.2)', color: '#E0001B' }}
                >
                  🎉 You&apos;re on the list — we&apos;ll be in touch.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 px-5 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: '#f4f6f9', border: '1.5px solid #e2e8f0', color: '#0f1923', fontSize: 15 }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-7 py-3.5 rounded-2xl font-semibold text-white whitespace-nowrap transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: '#E0001B', boxShadow: '0 4px 20px rgba(224,0,27,0.28)', fontSize: 15 }}
                  >
                    {loading ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </form>
              )}
              <p className="text-xs mt-3" style={{ color: '#a0aec0' }}>No spam. Just a heads-up when we launch.</p>
            </div>
          </div>

          {/* Right — Phone */}
          <div
            className="flex justify-center lg:justify-end items-center"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted
                ? `translateY(${scrollY * -0.04}px)`
                : `translateY(40px)`,
              transition: mounted
                ? 'opacity 0.8s ease 0.4s'
                : 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
            }}
          >
            <div style={{ position: 'relative' }}>
              {/* Glow behind phone */}
              <div
                style={{
                  position: 'absolute', inset: -40,
                  background: 'radial-gradient(ellipse, rgba(27,42,74,0.08) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity: mounted ? 0.3 : 0, transition: 'opacity 1.2s ease 1.4s' }}
      >
        <div
          className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
          style={{ borderColor: 'rgba(27,42,74,0.3)' }}
        >
          <div
            className="w-1 h-2 rounded-full"
            style={{
              background: '#1B2A4A',
              animation: 'scrollDot 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0); opacity: 1; }
          60% { transform: translateY(8px); opacity: 0; }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}

/* ─── Sticky Scroll Story ───────────────────────────────────────────────────── */

const story = [
  {
    stat: '62%',
    headline: 'of your missed callers never call back.',
    sub: 'Instead they move on to your competitors.',
    color: '#E0001B',
  },
  {
    stat: '78%',
    headline: 'of customers choose the first business to respond.',
    sub: 'Speed is the differentiator. Not price. Not reviews. Just who replies first.',
    color: '#E0001B',
  },
  {
    stat: 'Instant',
    headline: 'AutoReplyr responds to missed calls instantly.',
    sub: 'SMS follow-ups qualify and capture your leads.',
    color: '#E0001B',
  },
]

function StickyStory() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const progress = useSectionProgress(wrapperRef)

  const index = Math.min(Math.floor(progress * story.length), story.length - 1)
  const localProgress = (progress * story.length) - index
  const fadeIn = Math.min(localProgress / 0.12, 1)
  const fadeOut = localProgress > 0.88 ? Math.max(1 - (localProgress - 0.88) / 0.12, 0) : 1
  const opacity = Math.min(fadeIn, fadeOut)

  const slide = story[index]

  return (
    <div ref={wrapperRef} style={{ height: '300vh', position: 'relative' }}>
      <div
        style={{
          position: 'sticky', top: 0, height: '100vh',
          background: index === 1 ? '#ffffff' : '#E0001B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.6s ease',
          overflow: 'hidden',
        }}
      >
        {/* Progress dots */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {story.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === index ? 24 : 6, height: 6, borderRadius: 3,
                background: i === index
                  ? (index === 1 ? '#E0001B' : 'rgba(255,255,255,0.9)')
                  : (index === 1 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'),
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          className="text-center px-8 max-w-4xl"
          style={{ opacity, transform: `translateY(${(1 - opacity) * 14}px)`, transition: 'none', willChange: 'opacity, transform' }}
        >
          <div
            className="font-bold mb-6"
            style={{
              fontSize: 'clamp(80px, 14vw, 180px)',
              lineHeight: 1,
              color: index === 1 ? '#E0001B' : '#ffffff',
              letterSpacing: -4,
              transition: 'color 0.5s ease',
            }}
          >
            {slide.stat}
          </div>
          <h2
            className="font-bold mb-4"
            style={{ fontSize: 'clamp(24px, 3.5vw, 44px)', color: index === 1 ? '#1B2A4A' : '#ffffff', lineHeight: 1.2, letterSpacing: -1, textWrap: 'balance' } as React.CSSProperties}
          >
            {slide.headline}
          </h2>
          <p style={{ fontSize: 18, color: index === 1 ? 'rgba(27,42,74,0.55)' : 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto', textWrap: 'balance' } as React.CSSProperties}>
            {slide.sub}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── How It Works ──────────────────────────────────────────────────────────── */

const steps = [
  {
    n: '01', title: 'Customer calls. No answer.',
    body: "You're on a job, driving, or just unavailable. The call goes unanswered.",
    icon: <img src="/logos/Missedcall.png" alt="Missed call" width={160} height={160} style={{ objectFit: 'contain' }} />,
  },
  {
    n: '02', title: 'AutoReplyr fires in seconds.',
    body: 'The moment the call ends, AutoReplyr sends a personalized text from your number.',
    icon: <img src="/logos/Instantsend.png" alt="Instant send" width={160} height={160} style={{ objectFit: 'contain' }} />,
  },
  {
    n: '03', title: 'Lead Captured.',
    body: "AutoReplyr asks smart follow-up questions, scores the lead's intent, and alerts you.",
    icon: <img src="/logos/Alert.png" alt="Alert" width={160} height={160} style={{ objectFit: 'contain' }} />,
  },
]

/* ─── Integrations Strip ─────────────────────────────────────────────────────── */

const integrations = [
  { name: 'Quo',          src: '/logos/quo-logo.png' },
  { name: 'Twilio',       src: '/logos/twilio-logo.png' },
  { name: 'RingCentral',  src: '/logos/ringcentral-logo.png' },
  { name: 'Google Voice', src: '/logos/googlevoice-logo.png' },
  { name: 'Dialpad',      src: '/logos/dialpad-logo.png' },
  { name: 'Grasshopper',  src: '/logos/grasshopper-logo.png' },
  { name: 'Vonage',       src: '/logos/vonage-logo.png' },
  { name: 'Nextiva',      src: '/logos/nextiva-logo.png' },
  { name: 'Ooma',         src: '/logos/ooma-logo.png' },
]

function IntegrationsStrip() {
  const items = [...integrations, ...integrations] // duplicate for seamless loop
  return (
    <div style={{ background: '#f4f6f9', borderTop: '1px solid #e8edf3', borderBottom: '1px solid #e8edf3', padding: '28px 0' }}>
      {/* Works with label */}
      <p className="text-xs font-bold tracking-widest uppercase text-center mb-6" style={{ color: '#94a3b8' }}>
        Keep your existing number
      </p>

      {/* Marquee container */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Fade masks */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to right, #f4f6f9 0%, transparent 12%, transparent 88%, #f4f6f9 100%)',
        }} />

        {/* Scrolling track */}
        <div style={{
          display: 'flex',
          width: 'max-content',
          animation: 'marquee 22s linear infinite',
        }}>
          {items.map((int, i) => (
            <div key={i} className="flex items-center gap-3 mx-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={int.src}
                alt={int.name}
                width={44}
                height={44}
                style={{ objectFit: 'contain', borderRadius: 6, mixBlendMode: 'multiply' }}
              />
              <span className="text-base font-semibold whitespace-nowrap" style={{ color: '#1B2A4A' }}>{int.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── How It Works ───────────────────────────────────────────────────────────── */

function HowItWorks() {
  const { ref, inView } = useInView(0.1)
  return (
    <section id="how-it-works" className="py-20 px-8" style={{ background: '#f4f6f9' }}>
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="mb-12">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#E0001B', opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}
          >
            How It Works
          </p>
          <h2
            className="font-bold tracking-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 64px)',
              color: '#1B2A4A', lineHeight: 1.1, letterSpacing: -2,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.55s ease 0.08s, transform 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s',
            }}
          >
            Three steps.<br />Zero effort.
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-12">
          {steps.map((s, i) => <StepCard key={i} step={s} delay={i * 130} />)}
        </div>
      </div>
    </section>
  )
}

function StepCard({ step, delay }: { step: typeof steps[number]; delay: number }) {
  const { ref, inView } = useInView(0.1)
  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center flex-1"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      <div className="mb-6" style={{ width: 160, height: 160 }}>{step.icon}</div>
      <span className="text-sm font-bold tracking-widest mb-3 block" style={{ color: 'rgba(224,0,27,0.5)' }}>{step.n}</span>
      <h3 className="text-2xl font-bold leading-snug mb-3" style={{ color: '#1B2A4A', letterSpacing: -0.5 }}>{step.title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#64748b', maxWidth: 220 }}>{step.body}</p>
    </div>
  )
}

/* ─── Stats ─────────────────────────────────────────────────────────────────── */

const stats = [
  { value: 62, suffix: '%', label: 'of callers never call back after a missed call',    theme: 'red' },
  { value: 78, suffix: '%', label: 'of customers choose the first business to respond', theme: 'white' },
  { value: 3,  suffix: 'x', label: 'higher response rate via text vs. voicemail',       theme: 'red' },
]

function Stats() {
  const { ref, inView } = useInView(0.2)
  return (
    <section className="py-16 px-8" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf3', borderBottom: '1px solid #e8edf3' }}>
      <div className="max-w-6xl mx-auto" ref={ref}>
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((s, i) => <StatCard key={i} stat={s} delay={i * 110} active={inView} />)}
        </div>
      </div>
    </section>
  )
}

function StatCard({ stat, delay, active }: { stat: typeof stats[number]; delay: number; active: boolean }) {
  const { ref, inView } = useInView(0.05)
  const count = useCounter(stat.value, 2000, active)
  const red = stat.theme === 'red'
  return (
    <div
      ref={ref}
      className="py-12 px-8 rounded-3xl text-center"
      style={{
        background: red ? '#E0001B' : '#ffffff',
        border: red ? 'none' : '1px solid #e8edf3',
        boxShadow: red ? '0 4px 24px rgba(224,0,27,0.25)' : '0 2px 20px rgba(0,0,0,0.04)',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="font-bold mb-3 tracking-tight" style={{ fontSize: 64, lineHeight: 1, color: red ? '#ffffff' : '#E0001B', letterSpacing: -2 }}>
        {count}{stat.suffix}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: red ? 'rgba(255,255,255,0.8)' : '#64748b' }}>{stat.label}</p>
    </div>
  )
}

/* ─── Use Cases ──────────────────────────────────────────────────────────────── */

const useCases = [
  {
    title: 'Field Service',
    preview: 'You\'re on a job site. A new customer calls. AutoReplyr texts them back instantly so you don\'t lose the lead.',
    body: 'When you\'re on a job, every unanswered call is a potential customer lost. AutoReplyr texts back the moment a call is missed, asks what they need, and qualifies their urgency to save your leads while you are busy. High-intent leads get flagged immediately so you know who to call back first. You stay focused on the work. AutoReplyr handles the pipeline.',
  },
  {
    title: 'Customer Support',
    preview: 'After-hours calls and support lines don\'t have to go to voicemail. AutoReplyr captures issues and keeps customers informed.',
    body: 'Customers who can\'t reach you don\'t just wait. They get frustrated and look elsewhere. AutoReplyr steps in when your team is unavailable, acknowledges the customer right away, and gathers the details you\'ll need to follow up. Issues get logged, urgency gets confirmed, and your customers feel heard even when no one is there to answer. Fewer drop-offs. Better experiences.',
  },
  {
    title: 'Sales',
    preview: 'Inbound leads are hottest the moment they call. AutoReplyr keeps them engaged and scores intent before you pick up the phone.',
    body: 'Inbound leads go cold fast. AutoReplyr responds in seconds, keeps the conversation going, and asks the qualifying questions that matter: budget, timeline, and what they\'re looking for. By the time you call back, you already know who\'s serious and who\'s browsing. Your sales calls start warm. Your close rate goes up. And no lead slips through because you were busy.',
  },
]

function UseCases() {
  const { ref, inView } = useInView(0.1)
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="use-cases" className="py-20 px-8" style={{ background: '#ffffff' }}>
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#E0001B', opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}
          >
            Use Cases
          </p>
          <h2
            className="font-bold tracking-tight max-w-xl"
            style={{
              fontSize: 'clamp(32px, 4.5vw, 56px)',
              color: '#1B2A4A', lineHeight: 1.15, letterSpacing: -1.5,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.55s ease 0.08s, transform 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s',
            }}
          >
            One tool. Every missed call turned into a conversation.
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: 300 }}>
          {useCases.map((uc, i) => (
            <UseCaseCard
              key={i}
              useCase={uc}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCaseCard({
  useCase, index, isOpen, onToggle,
}: {
  useCase: typeof useCases[number]
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        flex: isOpen ? 4 : 1,
        minWidth: 0,
        border: isOpen ? '1.5px solid #E0001B' : '1.5px solid #e8edf3',
        borderRadius: 20,
        background: isOpen ? 'rgba(224,0,27,0.02)' : '#ffffff',
        cursor: 'pointer',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'flex 0.5s cubic-bezier(0.22,1,0.36,1), border-color 0.25s ease, background 0.25s ease',
        overflow: 'hidden',
      }}
    >
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(224,0,27,0.4)' }}>
          0{index + 1}
        </span>
        <h3
          style={{
            fontSize: isOpen ? 22 : 17,
            fontWeight: 700,
            color: '#1B2A4A',
            letterSpacing: -0.5,
            marginTop: 10,
            whiteSpace: isOpen ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'font-size 0.3s ease',
          }}
        >
          {useCase.title}
        </h3>

        {isOpen && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 12, lineHeight: 1.6 }}>
              {useCase.preview}
            </p>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75 }}>
              {useCase.body}
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: isOpen ? '#E0001B' : '#f4f6f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s ease, transform 0.2s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="1" x2="6" y2="11" stroke={isOpen ? 'white' : '#1B2A4A'} strokeWidth="2" strokeLinecap="round"/>
            <line x1="1" y1="6" x2="11" y2="6" stroke={isOpen ? 'white' : '#1B2A4A'} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ─── Waitlist CTA ──────────────────────────────────────────────────────────── */

function WaitlistCTA() {
  const { ref, inView } = useInView(0.1)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section
      id="waitlist"
      className="py-24 px-8 relative overflow-hidden"
      style={{ background: '#E0001B' }}
    >
      <div className="max-w-3xl mx-auto text-center relative z-10" ref={ref}>
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
          style={{
            color: '#ffffff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease',
          }}
        >
          Early Access
        </div>

        <h2
          className="font-bold tracking-tight mb-6"
          style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: '#ffffff', lineHeight: 1.1, letterSpacing: -2,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          }}
        >
          Stop losing leads<br />to voicemail.
        </h2>

        <p
          className="text-lg mb-10 leading-relaxed max-w-xl mx-auto"
          style={{
            color: 'rgba(255,255,255,0.8)',
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.7s ease 0.2s',
          }}
        >
          AutoReplyr texts missed callers back in seconds — turning ignored calls into booked jobs while you&apos;re heads-down on the work.
        </p>

        <div
          className="flex flex-wrap justify-center gap-6 mb-10 text-sm"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.7s ease 0.25s' }}
        >
          {['Setup in minutes', 'No app needed', 'Cancel anytime'].map(item => (
            <div key={item} className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="rgba(255,255,255,0.25)" />
                <path d="M4 7l2 2 4-4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        <div style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.7s ease 0.3s' }}>
          {submitted ? (
            <div
              className="inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-medium"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#ffffff' }}
            >
              🎉 You&apos;re on the list — talk soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-5 py-4 rounded-2xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#ffffff', fontSize: 15 }}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-4 rounded-2xl font-semibold text-white whitespace-nowrap hover:opacity-90 active:scale-95 transition-all duration-150"
                style={{ background: '#ffffff', color: '#E0001B', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: 15 }}
              >
                {loading ? 'Joining...' : 'Get Early Access'}
              </button>
            </form>
          )}
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No spam. Just a heads-up when we launch.</p>
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="py-8 px-8 flex flex-col sm:flex-row items-center justify-between gap-4"
      style={{ background: '#0f1923', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>AutoReplyr</span>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/privacy" className="text-xs transition-colors hover:text-white/60" style={{ color: 'rgba(255,255,255,0.25)' }}>Privacy</Link>
        <Link href="/terms" className="text-xs transition-colors hover:text-white/60" style={{ color: 'rgba(255,255,255,0.25)' }}>Terms</Link>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} AutoReplyr</span>
      </div>
    </footer>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <IntegrationsStrip />
      <StickyStory />
      <HowItWorks />
      <UseCases />
      <WaitlistCTA />
      <Footer />
    </main>
  )
}
