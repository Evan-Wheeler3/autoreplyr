import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Privacy Policy — AutoReplyr' }

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <Image src="/logo-removebg-preview.png" alt="AutoReplyr" width={32} height={32} className="object-contain" />
        <span className="font-bold text-lg tracking-tight" style={{ color: '#1B2A4A' }}>AutoReplyr</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/terms" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Terms of Service</Link>
        <Link
          href="/onboarding"
          className="text-sm font-bold px-4 py-2 rounded-full text-white transition-all"
          style={{ background: '#E0001B', boxShadow: '0 2px 10px rgba(224,0,27,0.3)' }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-[#1B2A4A]/8 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-[#1B2A4A] uppercase tracking-wide">Legal</span>
            </div>
            <h1 className="text-4xl font-bold text-[#1B2A4A] mb-3">Privacy Policy</h1>
            <p className="text-slate-500 text-sm">Effective date: April 28, 2026 · Last updated: May 10, 2026</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">

            <p className="text-slate-600 text-sm leading-relaxed mb-10">
              This Privacy Policy describes how Velza LLC ("we", "us", "our") collects, uses, and protects information in connection with the AutoReplyr service ("Service"). By using the Service you agree to the practices described in this policy.
            </p>

            <Section title="1. Who We Are">
              <p>AutoReplyr is an automated SMS follow-up platform for local service businesses, operated by Velza LLC. Our website is <a href="https://autoreplyr.com" className="text-[#1B2A4A] underline">autoreplyr.com</a>. If you have questions about this policy, contact us at <a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a>.</p>
            </Section>

            <Section title="2. Information We Collect">
              <p><strong className="text-slate-800">From business clients (subscribers):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, and business name provided during signup</li>
                <li>Phone number(s) associated with your business</li>
                <li>VoIP provider API credentials (stored encrypted)</li>
                <li>Billing information (processed and stored by Stripe — we never store card numbers)</li>
                <li>Dashboard activity, flow customizations, and lead notes</li>
              </ul>
              <p className="mt-3"><strong className="text-slate-800">From callers (end users who missed your business):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Phone number of the incoming caller</li>
                <li>Content of SMS messages exchanged during the follow-up conversation</li>
                <li>Inferred intent level based on conversation content</li>
              </ul>
              <p className="mt-3"><strong className="text-slate-800">Automatically collected:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Server logs including IP addresses and request timestamps</li>
                <li>Basic usage analytics (page views, feature usage) — no third-party tracking pixels</li>
              </ul>
            </Section>

            <Section title="3. How We Use Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Deliver the Service — trigger SMS conversations when a call is missed and surface leads in your dashboard</li>
                <li>Process billing and manage your subscription via Stripe</li>
                <li>Send transactional emails (account confirmation, setup instructions, billing receipts)</li>
                <li>Send weekly lead summary reports to subscribed clients</li>
                <li>Notify business owners of high-intent leads via SMS alert</li>
                <li>Improve the Service through aggregate usage analysis</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>We do not use caller data for advertising or sell it to third parties.</p>
            </Section>

            <Section title="4. SMS Consent & Opt-Out">
              <p>Callers receive an initial automated SMS after a missed call. This message is a service-initiated communication in response to a call attempt. Each conversation includes opt-out instructions.</p>
              <p>Callers may opt out at any time by replying <strong>STOP</strong>. Upon receiving STOP, they will receive one final confirmation message and no further messages from that business number. Reply <strong>HELP</strong> for assistance.</p>
              <p>Message and data rates may apply. Message frequency depends on the business's configured conversation flow.</p>
            </Section>

            <Section title="5. Data Sharing">
              <p>We do not sell your personal information. We may share information in the following limited circumstances:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">Service providers:</strong> We use Supabase (database), Stripe (payments), Resend (email), and Vercel (hosting). Each processes data only as necessary to provide their service.</li>
                <li><strong className="text-slate-800">VoIP providers:</strong> Your API credentials are passed to your chosen VoIP provider to send and receive SMS on your behalf.</li>
                <li><strong className="text-slate-800">Legal requirements:</strong> We may disclose information if required by law, subpoena, or other legal process, or to protect the rights and safety of our users or the public.</li>
                <li><strong className="text-slate-800">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              </ul>
            </Section>

            <Section title="6. Data Retention">
              <p>We retain business client account data for as long as your subscription is active. After cancellation, we retain your data for 90 days before deletion, unless you request earlier deletion.</p>
              <p>Caller conversation records (phone number + transcript) are retained for up to 12 months and then deleted automatically. Business clients may request deletion of caller data at any time.</p>
            </Section>

            <Section title="7. Data Security">
              <p>We implement industry-standard security measures including encrypted data storage, HTTPS-only transmission, and access controls. API credentials are stored encrypted. However, no system is completely secure and we cannot guarantee absolute security.</p>
              <p>If you believe your account has been compromised, contact us immediately at <a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a>.</p>
            </Section>

            <Section title="8. Your Rights">
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong className="text-slate-800">Correction:</strong> Request correction of inaccurate data</li>
                <li><strong className="text-slate-800">Deletion:</strong> Request deletion of your personal data</li>
                <li><strong className="text-slate-800">Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong className="text-slate-800">Opt-out of SMS:</strong> Callers may reply STOP at any time</li>
              </ul>
              <p>To exercise any of these rights, contact <a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a>. We will respond within 30 days.</p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>The Service is not directed at individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us and we will delete it promptly.</p>
            </Section>

            <Section title="10. Third-Party Links">
              <p>The Service may contain links to third-party websites or integrations. This Privacy Policy does not apply to those third parties. We encourage you to review the privacy policies of any third-party services you use.</p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice in your dashboard. The updated policy will be effective upon posting, and your continued use of the Service constitutes acceptance.</p>
            </Section>

            <Section title="12. Contact">
              <p>Questions, concerns, or requests regarding this Privacy Policy:</p>
              <div className="bg-gray-50 rounded-xl p-4 mt-2">
                <p className="font-medium text-[#1B2A4A]">Velza LLC / AutoReplyr</p>
                <p><a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a></p>
                <p><a href="https://autoreplyr.com" className="text-[#1B2A4A] underline">autoreplyr.com</a></p>
              </div>
            </Section>

          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Velza LLC · <Link href="/terms" className="underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </>
  )
}
