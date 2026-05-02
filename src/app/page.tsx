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
  { from: 'me'   as const, text: 'My AC stopped working last night', delay: 2700 },
  { from: 'them' as const, text: "Got it — that's urgent. The team has been notified and will reach out shortly!", delay: 3500 },
]

interface ChatMsg { from: 'them' | 'me'; text: string }
interface Option { label: string; response: string; next?: Option[] }

const FLOW: Option[] = [
  {
    label: 'How soon can someone come?',
    response: "You're first on the list. Expect a call within 30–60 minutes.",
    next: [
      { label: 'Perfect, thanks!', response: 'Of course! We\'ll be in touch shortly.' },
      { label: 'Can someone come today?', response: 'Yes — a tech is already in your area today.' },
    ],
  },
  {
    label: 'What will it cost?',
    response: "Pricing depends on the issue. Our tech gives you an exact quote on-site — no surprises.",
    next: [
      { label: 'Sounds fair', response: 'Great! We\'ll be in touch soon.' },
      { label: 'Do you offer financing?', response: 'Yes — same-day financing is available. Ask the tech when they arrive.' },
    ],
  },
  {
    label: "Thanks, I'll wait for the call",
    response: "We'll be in touch soon! Reply anytime if anything changes.",
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
        <span
          className="font-bold text-lg tracking-tight transition-colors duration-300"
          style={{ color: scrolled ? '#1B2A4A' : '#1B2A4A' }}
        >
          AutoReplyr
        </span>
      </div>
    </nav>
  )
}

/* ─── Scrolling Plane ─────────────────────────────────────────────────────── */

function ScrollingPlane() {
  const scrollY = useScrollY()
  const [maxScroll, setMaxScroll] = useState(1)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    setMaxScroll(document.documentElement.scrollHeight - window.innerHeight)
  }, [])

  const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0
  const yVh = 8 + progress * 80

  function handleClick() {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      className="fixed z-40 hidden xl:flex items-center gap-2"
      style={{
        top: `${yVh}vh`,
        right: '2vw',
        cursor: 'pointer',
        transition: 'top 0.08s linear',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {hovered && (
        <div style={{
          background: '#E0001B',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          padding: '5px 12px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 12px rgba(224,0,27,0.35)',
          letterSpacing: '0.02em',
        }}>
          Join Waitlist →
        </div>
      )}
      <div style={{
        transform: `scale(${hovered ? 1.15 : 1})`,
        transition: 'transform 0.15s ease',
        filter: 'drop-shadow(0 2px 14px rgba(224,0,27,0.5))',
        opacity: hovered ? 1 : 0.92,
      }}>
        <Image src="/plane.png" alt="Join Waitlist" width={48} height={48} className="object-contain" />
      </div>
    </div>
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
              You missed<br />
              the call.<br />
              <span style={{ color: '#E0001B' }}>We sent</span><br />
              <span style={{ color: '#E0001B' }}>the text.</span>
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
              AutoReplyr texts your missed callers back in seconds — automatically qualifying leads while you&apos;re on the job.
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
      `}</style>
    </section>
  )
}

/* ─── Sticky Scroll Story ───────────────────────────────────────────────────── */

const story = [
  {
    stat: '62%',
    headline: 'of your missed callers never call back.',
    sub: 'They hang up, open Google, and dial the next contractor on the list.',
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
    headline: 'We respond before they try anyone else.',
    sub: 'The moment the call ends, AutoReplyr fires. Before they\'ve put their phone down.',
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
          background: index === 1 ? '#1B2A4A' : '#0f1923',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.6s ease',
          overflow: 'hidden',
        }}
      >
        {/* Background noise texture */}
        <div
          style={{
            position: 'absolute', inset: 0, opacity: 0.03,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Progress dots */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {story.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === index ? 24 : 6, height: 6,
                borderRadius: 3,
                background: i === index ? (story[i].color) : 'rgba(255,255,255,0.2)',
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
              color: slide.color,
              letterSpacing: -4,
              transition: 'color 0.5s ease',
            }}
          >
            {slide.stat}
          </div>
          <h2
            className="font-bold mb-4"
            style={{ fontSize: 'clamp(24px, 3.5vw, 44px)', color: '#ffffff', lineHeight: 1.2, letterSpacing: -1 }}
          >
            {slide.headline}
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', maxWidth: 560, margin: '0 auto' }}>
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
    icon: (
      <svg width="100" height="100" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="rgba(224,0,27,0.08)" />
        <path d="M25.5 24.5c-.8-.8-1.9-1.3-3-.8l-1.2.5c-.4.2-.9.1-1.2-.2l-4.1-4.1c-.3-.3-.4-.8-.2-1.2l.5-1.2c.5-1.1 0-2.2-.8-3l-1.2-1.2c-.8-.8-2-.8-2.8 0l-.7.7C9.8 15 9.6 16.8 10.5 18.5c1.2 2.4 3.1 5 5.8 7.7 2.7 2.7 5.3 4.6 7.7 5.8 1.7.9 3.5.7 4.8-.6l.7-.7c.8-.8.8-2 0-2.8l-4-3.4z" fill="#E0001B" />
        <line x1="26" y1="10" x2="32" y2="16" stroke="#E0001B" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="10" x2="32" y2="10" stroke="#E0001B" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="10" x2="32" y2="16" stroke="#E0001B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: '02', title: 'AutoReplyr fires in seconds.',
    icon: (
      <svg width="100" height="100" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="rgba(224,0,27,0.08)" />
        <path d="M11 29L30 12" stroke="#E0001B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 12L19 14.5L22 20L28.5 23L30 12Z" fill="#E0001B" />
        <path d="M22 20L18 30L19.5 23.5" stroke="#E0001B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    n: '03', title: 'Lead captured. You get notified.',
    icon: (
      <svg width="100" height="100" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="rgba(224,0,27,0.08)" />
        <rect x="11" y="13" width="18" height="13" rx="2" stroke="#E0001B" strokeWidth="2.2" />
        <path d="M11 17l9 6 9-6" stroke="#E0001B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="13" r="4" fill="#E0001B" />
        <path d="M26.5 13l1 1.2 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function HowItWorks() {
  const { ref, inView } = useInView(0.1)
  return (
    <section className="py-32 px-8" style={{ background: '#f4f6f9' }}>
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="mb-20">
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

        <div className="flex flex-col sm:flex-row justify-center gap-6">
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
      className="flex flex-col items-center text-center"
      style={{
        width: 200,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      <div className="mb-5" style={{ width: 100, height: 100 }}>{step.icon}</div>
      <span className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'rgba(224,0,27,0.5)' }}>{step.n}</span>
      <h3 className="text-base font-bold leading-snug" style={{ color: '#1B2A4A', letterSpacing: -0.3 }}>{step.title}</h3>
    </div>
  )
}

/* ─── Stats ─────────────────────────────────────────────────────────────────── */

const stats = [
  { value: 62, suffix: '%', label: 'of callers never call back after a missed call' },
  { value: 78, suffix: '%', label: 'of customers choose the first business to respond' },
  { value: 3,  suffix: 'x', label: 'higher response rate via text vs. voicemail' },
]

function Stats() {
  const { ref, inView } = useInView(0.2)
  return (
    <section className="py-28 px-8" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf3', borderBottom: '1px solid #e8edf3' }}>
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
  return (
    <div
      ref={ref}
      className="py-12 px-8 rounded-3xl text-center"
      style={{
        background: '#ffffff',
        border: '1px solid #e8edf3',
        boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="font-bold mb-3 tracking-tight" style={{ fontSize: 64, lineHeight: 1, color: '#E0001B', letterSpacing: -2 }}>
        {count}{stat.suffix}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{stat.label}</p>
    </div>
  )
}

/* ─── Industries ─────────────────────────────────────────────────────────────── */

const industries = [
  { label: 'HVAC', desc: 'Heating & Cooling' },
  { label: 'Plumbing', desc: 'Residential & Commercial' },
  { label: 'Roofing', desc: 'Repair & Replacement' },
  { label: 'Electrical', desc: 'Wiring & Panels' },
  { label: 'Pest Control', desc: 'Removal & Prevention' },
  { label: 'Landscaping', desc: 'Lawn & Garden' },
]

function WhoItsFor() {
  const { ref, inView } = useInView(0.1)
  return (
    <section className="py-32 px-8" style={{ background: '#ffffff' }}>
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="mb-16">
          <p className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#E0001B', opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}
          >
            Built For
          </p>
          <h2
            className="font-bold tracking-tight max-w-lg"
            style={{
              fontSize: 'clamp(32px, 4.5vw, 56px)',
              color: '#1B2A4A', lineHeight: 1.15, letterSpacing: -1.5,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.55s ease 0.08s, transform 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s',
            }}
          >
            Local service businesses that can&apos;t afford to miss a call.
          </h2>
        </div>

        <p className="text-lg mb-10 max-w-2xl" style={{ color: '#475569', lineHeight: 1.6 }}>
          SMBs lose an average of <span className="font-semibold" style={{ color: '#1B2A4A' }}>$100,000+ per year</span> to missed calls alone — leads that went to voicemail, got frustrated, and called a competitor instead.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {industries.map((ind, i) => <IndCard key={i} ind={ind} delay={i * 75} />)}
        </div>
      </div>
    </section>
  )
}

function IndCard({ ind, delay }: { ind: typeof industries[number]; delay: number }) {
  const { ref, inView } = useInView(0.05)
  return (
    <div
      ref={ref}
      className="p-7 rounded-3xl group cursor-default"
      style={{
        background: '#f8fafc',
        border: '1px solid #e8edf3',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className="font-bold text-lg mb-1 tracking-tight" style={{ color: '#1B2A4A' }}>{ind.label}</div>
      <div className="text-sm" style={{ color: '#94a3b8' }}>{ind.desc}</div>
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
      className="py-36 px-8 relative overflow-hidden"
      style={{ background: '#1B2A4A' }}
    >
      <div className="max-w-3xl mx-auto text-center relative z-10" ref={ref}>
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
          style={{
            color: '#E0001B', background: 'rgba(224,0,27,0.12)', border: '1px solid rgba(224,0,27,0.2)',
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
            color: 'rgba(255,255,255,0.55)',
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
            <div key={item} className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="rgba(224,0,27,0.25)" />
                <path d="M4 7l2 2 4-4" stroke="#E0001B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        <div style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.7s ease 0.3s' }}>
          {submitted ? (
            <div
              className="inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-medium"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}
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
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: 15 }}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-4 rounded-2xl font-semibold text-white whitespace-nowrap hover:opacity-90 active:scale-95 transition-all duration-150"
                style={{ background: '#E0001B', boxShadow: '0 4px 20px rgba(224,0,27,0.35)', fontSize: 15 }}
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
      <ScrollingPlane />
      <Hero />
      <StickyStory />
      <HowItWorks />
      <WhoItsFor />
      <WaitlistCTA />
      <Footer />
    </main>
  )
}
