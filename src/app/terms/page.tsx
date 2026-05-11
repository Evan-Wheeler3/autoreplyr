import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Terms of Service — AutoReplyr' }

function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-500"
      style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'saturate(180%) blur(20px)', boxShadow: '0 1px 0 rgba(0,0,0,0.07)' }}
    >
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <Image src="/logo-removebg-preview.png" alt="AutoReplyr" width={32} height={32} className="object-contain" />
        <span className="font-bold text-lg tracking-tight" style={{ color: '#1B2A4A' }}>AutoReplyr</span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/#how-it-works" className="text-sm font-medium transition-colors duration-200" style={{ color: '#475569', textDecoration: 'none' }}>How it Works</Link>
          <Link href="/#use-cases" className="text-sm font-medium transition-colors duration-200" style={{ color: '#475569', textDecoration: 'none' }}>Use Cases</Link>
          <Link href="/demo" className="text-sm font-medium transition-colors duration-200" style={{ color: '#475569', textDecoration: 'none' }}>Demo</Link>
        </div>
        <Link
          href="/#waitlist"
          className="text-sm font-bold px-4 py-2 rounded-full transition-all duration-200"
          style={{ background: '#E0001B', color: '#fff', boxShadow: '0 2px 10px rgba(224,0,27,0.3)', textDecoration: 'none' }}
        >
          Join!
        </Link>
      </div>
    </nav>
  )
}

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsPage() {
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
            <h1 className="text-4xl font-bold text-[#1B2A4A] mb-3">Terms of Service</h1>
            <p className="text-slate-500 text-sm">Effective date: April 28, 2026 · Last updated: May 10, 2026</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">

            <p className="text-slate-600 text-sm leading-relaxed mb-10">
              These Terms of Service ("Terms") govern your use of AutoReplyr ("Service"), operated by Velza LLC ("we", "us", "our"). By signing up for or using AutoReplyr, you agree to be bound by these Terms. Please read them carefully.
            </p>

            <Section title="1. Service Description">
              <p>AutoReplyr is an automated SMS follow-up platform that helps local service businesses recover missed calls. When a call to your business goes unanswered, AutoReplyr sends an automated SMS to the caller on your behalf, initiates a qualification conversation, and surfaces leads in your dashboard.</p>
              <p>The Service integrates with your existing VoIP phone system via API or webhook. AutoReplyr does not port, replace, or take ownership of your phone number. You retain full control of your number and phone system at all times.</p>
            </Section>

            <Section title="2. Eligibility">
              <p>You must be at least 18 years old and have the legal authority to enter into this agreement on behalf of yourself or your business. By using the Service you represent that all information you provide is accurate and complete.</p>
            </Section>

            <Section title="3. Account Registration">
              <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at <a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a> if you suspect unauthorized access to your account. We are not liable for any loss arising from unauthorized use of your account.</p>
            </Section>

            <Section title="4. SMS Messaging & TCPA Compliance">
              <p>AutoReplyr sends SMS messages on your behalf to individuals who have called your business phone number. By using the Service you acknowledge and agree to the following:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You are responsible for ensuring your use of the Service complies with all applicable laws, including the Telephone Consumer Protection Act (TCPA), the CAN-SPAM Act, and applicable state laws.</li>
                <li>The initial SMS sent to a missed caller is a service-related communication initiated in response to a call attempt. You are solely responsible for ensuring your business's communication practices comply with applicable telemarketing and messaging regulations.</li>
                <li>You must provide a clear opt-out mechanism. AutoReplyr includes STOP opt-out handling automatically. Callers who reply STOP will receive one final confirmation message and no further messages.</li>
                <li>Message and data rates may apply to recipients. Message frequency depends on the conversation flow you configure.</li>
                <li>You may not use AutoReplyr to send spam, unsolicited marketing messages, or any content that violates applicable law.</li>
              </ul>
            </Section>

            <Section title="5. Acceptable Use">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Send messages that are harassing, abusive, threatening, defamatory, or otherwise objectionable</li>
                <li>Impersonate any person or entity</li>
                <li>Violate any applicable law or regulation</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Attempt to gain unauthorized access to any part of the Service or its related systems</li>
                <li>Resell or sublicense access to the Service without our written consent</li>
              </ul>
            </Section>

            <Section title="6. Subscription & Billing">
              <p>AutoReplyr is offered on a subscription basis. Your subscription begins after completing the checkout process. Billing occurs automatically at the start of each billing period (monthly or annual, as selected).</p>
              <p>New subscribers receive a <strong>7-day free trial</strong>. A valid payment method is required to start the trial. You will not be charged until the trial period ends. You may cancel at any time before the trial ends to avoid being charged.</p>
              <p>All fees are non-refundable except as required by law or as stated in our cancellation policy. We reserve the right to change pricing with 30 days' notice to your registered email address.</p>
            </Section>

            <Section title="7. Cancellation">
              <p>You may cancel your subscription at any time from your dashboard or by contacting <a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a>. Cancellation takes effect at the end of the current billing period. You will continue to have access to the Service until that date.</p>
              <p>We reserve the right to suspend or terminate your account immediately if you violate these Terms.</p>
            </Section>

            <Section title="8. Data & Privacy">
              <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-[#1B2A4A] underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Service you consent to our collection and use of data as described therein.</p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>The AutoReplyr platform, including its software, design, trademarks, and content, is owned by Velza LLC and protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service solely for your internal business purposes during your subscription period.</p>
            </Section>

            <Section title="10. Third-Party Integrations">
              <p>AutoReplyr integrates with third-party VoIP providers (OpenPhone, RingCentral, Zoom Phone, and others). Your use of those platforms is governed by their respective terms of service. We are not responsible for the availability, functionality, or policies of third-party services.</p>
            </Section>

            <Section title="11. Disclaimer of Warranties">
              <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.</p>
              <p>We are not responsible for missed or delayed messages due to carrier issues, network outages, or third-party platform limitations.</p>
            </Section>

            <Section title="12. Limitation of Liability">
              <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, VELZA LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF THE SERVICE.</p>
              <p>OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE THREE MONTHS PRECEDING THE CLAIM.</p>
            </Section>

            <Section title="13. Indemnification">
              <p>You agree to indemnify, defend, and hold harmless Velza LLC and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any applicable law or third-party rights.</p>
            </Section>

            <Section title="14. Modifications to Terms">
              <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by email or by posting a notice in your dashboard. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the updated Terms.</p>
            </Section>

            <Section title="15. Governing Law">
              <p>These Terms are governed by the laws of the State of Tennessee, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Tennessee.</p>
            </Section>

            <Section title="16. Contact">
              <p>Questions about these Terms? Contact us at:</p>
              <div className="bg-gray-50 rounded-xl p-4 mt-2">
                <p className="font-medium text-[#1B2A4A]">Velza LLC / AutoReplyr</p>
                <p><a href="mailto:evan@velza.com" className="text-[#1B2A4A] underline">evan@velza.com</a></p>
                <p><a href="https://autoreplyr.com" className="text-[#1B2A4A] underline">autoreplyr.com</a></p>
              </div>
            </Section>

          </div>

        </div>
      </div>
      <Footer />
    </>
  )
}
